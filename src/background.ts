import { isChallengeActive } from './lib/dates';
import { isBlockedHostname, normalizeHostname } from './lib/domain';
import { getSettings, incrementTodayAttempts } from './lib/storage';

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || details.tabId < 0) {
    return;
  }

  const url = safeUrl(details.url);

  if (!url || !['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  const settings = await getSettings();

  if (!isChallengeActive(settings.challenge)) {
    return;
  }

  const hostname = normalizeHostname(url.hostname);

  if (!isBlockedHostname(hostname, settings.blockedDomains)) {
    return;
  }

  await incrementTodayAttempts();

  const blockedUrl = chrome.runtime.getURL(
    `blocked.html?host=${encodeURIComponent(hostname)}`
  );

  await chrome.tabs.update(details.tabId, { url: blockedUrl });
});

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
