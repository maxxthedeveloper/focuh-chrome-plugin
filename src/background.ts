import { todayKey } from './lib/dates';
import { decideAccess } from './lib/decision';
import { isBlockedHostname, normalizeHostname } from './lib/domain';
import {
  CommitmentSettings,
  getSettings,
  getUsage,
  incrementTodayAttempts,
  pruneUsage,
  saveUsage
} from './lib/storage';
import {
  USAGE_ALARM_NAME,
  USAGE_ALARM_PERIOD_MINUTES,
  flushTracking,
  startTracking,
  stopTracking,
  usedSecondsOn
} from './lib/tracking';

const IDLE_DETECTION_SECONDS = 60;

// Storage writes from concurrent event handlers would race read-modify-write;
// serialize them. The queue only has to survive one service-worker lifetime
// because every handler re-reads persisted state.
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): void {
  queue = queue.then(task, task);
}

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) {
    return;
  }

  const url = safeUrl(details.url);

  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  enqueue(() => handleNavigation(details.tabId, url));
});

chrome.tabs.onActivated.addListener(() => {
  enqueue(reevaluate);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    enqueue(reevaluate);
  }
});

chrome.tabs.onRemoved.addListener(() => {
  enqueue(reevaluate);
});

chrome.windows.onFocusChanged.addListener(() => {
  enqueue(reevaluate);
});

chrome.idle.setDetectionInterval(IDLE_DETECTION_SECONDS);
chrome.idle.onStateChanged.addListener(() => {
  enqueue(reevaluate);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === USAGE_ALARM_NAME) {
    enqueue(reevaluate);
  }
});

// React to rule edits from the options page, but not to the background's own
// usage writes — reevaluate() persists usage, so listening to the `usage` key
// would loop forever.
const SETTINGS_KEYS = ['challenge', 'blockedDomains', 'workSchedule', 'dailyAllowanceMinutes'];

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && SETTINGS_KEYS.some((key) => key in changes)) {
    enqueue(reevaluate);
  }
});

chrome.runtime.onStartup.addListener(() => {
  enqueue(reevaluate);
});

// Runs on every service-worker start, so a restart mid-tracking flushes the
// persisted tracking state (clamped) and resumes if still applicable.
enqueue(reevaluate);

async function handleNavigation(tabId: number, url: URL): Promise<void> {
  const settings = await getSettings();
  const hostname = normalizeHostname(url.hostname);

  if (!isBlockedHostname(hostname, settings.blockedDomains)) {
    return;
  }

  const now = new Date();
  const usage = flushTracking(await getUsage(), now);
  await saveUsage(usage);

  const decision = decideAccess(settings, usedSecondsOn(usage, todayKey(now)), now);

  if (decision !== 'block') {
    // 'allow-tracked' navigations start tracking once tabs.onUpdated fires
    // for the committed URL; 'free' and 'inactive' need nothing.
    return;
  }

  await incrementTodayAttempts();
  await chrome.tabs.update(tabId, {
    url: blockedPageUrl(hostname, settings.dailyAllowanceMinutes > 0 ? 'allowance' : null)
  });
}

async function reevaluate(): Promise<void> {
  const settings = await getSettings();
  const now = new Date();

  let usage = pruneUsage(flushTracking(await getUsage(), now), settings.challenge.startDate);

  const used = usedSecondsOn(usage, todayKey(now));
  const decision = decideAccess(settings, used, now);

  const trackable =
    decision === 'allow-tracked' ? await findTrackableTab(settings.blockedDomains) : null;

  if (trackable) {
    usage = startTracking(usage, trackable, now);
    await chrome.alarms.create(USAGE_ALARM_NAME, {
      periodInMinutes: USAGE_ALARM_PERIOD_MINUTES
    });
  } else {
    usage = stopTracking(usage);
    await chrome.alarms.clear(USAGE_ALARM_NAME);
  }

  await saveUsage(usage);

  const allowanceExhausted =
    settings.dailyAllowanceMinutes > 0 && used >= settings.dailyAllowanceMinutes * 60;

  if (decision === 'block' && allowanceExhausted) {
    await sweepBlockedTabs(settings);
  }
}

/**
 * Returns the active tab of the focused window when it is on a blocked
 * domain and the user is present — the only situation that consumes
 * allowance time.
 */
async function findTrackableTab(
  blockedDomains: string[]
): Promise<{ tabId: number; windowId: number; hostname: string } | null> {
  const idleState = await chrome.idle.queryState(IDLE_DETECTION_SECONDS);

  if (idleState !== 'active') {
    return null;
  }

  const window = await chrome.windows.getLastFocused().catch(() => null);

  if (!window?.focused) {
    return null;
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  if (!tab || tab.id == null || tab.id < 0 || !tab.url) {
    return null;
  }

  const url = safeUrl(tab.url);

  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    return null;
  }

  const hostname = normalizeHostname(url.hostname);

  if (!isBlockedHostname(hostname, blockedDomains)) {
    return null;
  }

  return { tabId: tab.id, windowId: tab.windowId, hostname };
}

async function sweepBlockedTabs(settings: CommitmentSettings): Promise<void> {
  const tabs = await chrome.tabs.query({});

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id == null || tab.id < 0 || !tab.url) {
        return;
      }

      const url = safeUrl(tab.url);

      if (!url || !['http:', 'https:'].includes(url.protocol)) {
        return;
      }

      const hostname = normalizeHostname(url.hostname);

      if (!isBlockedHostname(hostname, settings.blockedDomains)) {
        return;
      }

      await chrome.tabs
        .update(tab.id, { url: blockedPageUrl(hostname, 'allowance') })
        .catch(() => undefined);
    })
  );
}

function blockedPageUrl(hostname: string, reason: 'allowance' | null): string {
  const params = new URLSearchParams({ host: hostname });

  if (reason) {
    params.set('reason', reason);
  }

  return chrome.runtime.getURL(`blocked.html?${params.toString()}`);
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
