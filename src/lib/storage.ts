import { Challenge, compareDateKeys, daysBetweenInclusive, todayKey } from './dates';
import { WorkSchedule, isValidWorkSchedule } from './schedule';

export interface CommitmentSettings {
  challenge: Challenge;
  blockedDomains: string[];
  dailyAttempts: Record<string, number>;
  /** null = block 24/7 during the challenge (legacy behavior). */
  workSchedule: WorkSchedule | null;
  /** 0 = no allowance, blocked sites are always blocked (legacy behavior). */
  dailyAllowanceMinutes: number;
}

export interface TrackingState {
  tabId: number;
  windowId: number;
  hostname: string;
  startedAt: number;
  dateKey: string;
}

export interface UsageState {
  dailyUsageSeconds: Record<string, number>;
  trackingState: TrackingState | null;
}

export const MAX_ALLOWANCE_MINUTES = 1440;

const today = todayKey();

export const defaultSettings: CommitmentSettings = {
  challenge: {
    startDate: today,
    endDate: today
  },
  blockedDomains: [],
  dailyAttempts: {},
  workSchedule: null,
  dailyAllowanceMinutes: 0
};

export const defaultUsage: UsageState = {
  dailyUsageSeconds: {},
  trackingState: null
};

export async function getSettings(): Promise<CommitmentSettings> {
  if (!hasChromeStorage()) {
    return normalizeSettings(readLocalSettings());
  }

  const stored = await chrome.storage.local.get(defaultSettings);
  return normalizeSettings(stored);
}

export async function saveSettings(settings: CommitmentSettings): Promise<void> {
  if (!hasChromeStorage()) {
    localStorage.setItem('commitment-settings', JSON.stringify(settings));
    return;
  }

  await chrome.storage.local.set(settings);
}

export async function updateSettings(
  updater: (settings: CommitmentSettings) => CommitmentSettings
): Promise<CommitmentSettings> {
  const settings = await getSettings();
  const nextSettings = updater(settings);
  await saveSettings(nextSettings);
  return nextSettings;
}

export async function getUsage(): Promise<UsageState> {
  if (!hasChromeStorage()) {
    return normalizeUsage(readLocalUsage());
  }

  const stored = await chrome.storage.local.get({ usage: defaultUsage });
  return normalizeUsage(stored.usage);
}

export async function saveUsage(usage: UsageState): Promise<void> {
  if (!hasChromeStorage()) {
    localStorage.setItem('commitment-usage', JSON.stringify(usage));
    return;
  }

  await chrome.storage.local.set({ usage });
}

export async function updateUsage(
  updater: (usage: UsageState) => UsageState
): Promise<UsageState> {
  const usage = await getUsage();
  const nextUsage = updater(usage);
  await saveUsage(nextUsage);
  return nextUsage;
}

export async function resetUsage(): Promise<void> {
  await saveUsage(defaultUsage);
}

export async function incrementTodayAttempts(dateKey = todayKey()): Promise<number> {
  let nextCount = 0;

  await updateSettings((settings) => {
    nextCount = (settings.dailyAttempts[dateKey] ?? 0) + 1;

    return {
      ...settings,
      dailyAttempts: {
        ...settings.dailyAttempts,
        [dateKey]: nextCount
      }
    };
  });

  return nextCount;
}

export function removeBlockedDomainFromSettings(
  settings: CommitmentSettings,
  domain: string,
  options: { restartChallenge?: boolean; today?: string } = {}
): CommitmentSettings {
  const blockedDomains = settings.blockedDomains.filter((blockedDomain) => blockedDomain !== domain);

  if (!options.restartChallenge) {
    return {
      ...settings,
      blockedDomains
    };
  }

  return restartChallenge(
    {
      ...settings,
      blockedDomains
    },
    options.today
  );
}

export function restartChallenge(
  settings: CommitmentSettings,
  todayValue = todayKey()
): CommitmentSettings {
  const challengeDays = daysBetweenInclusive(settings.challenge.startDate, settings.challenge.endDate);

  return {
    ...settings,
    challenge: {
      startDate: todayValue,
      endDate: addDays(todayValue, challengeDays - 1)
    },
    dailyAttempts: {}
  };
}

/**
 * Loosening the rules (making blocked sites more accessible) restarts the
 * challenge; tightening them is always allowed. Adding or editing a work
 * schedule loosens (blocking applies to fewer hours), removing it tightens.
 * Raising the allowance loosens, lowering or disabling it tightens.
 */
export function isLoosening(prev: CommitmentSettings, next: CommitmentSettings): boolean {
  const scheduleChanged =
    JSON.stringify(prev.workSchedule) !== JSON.stringify(next.workSchedule);

  if (scheduleChanged && next.workSchedule !== null) {
    return true;
  }

  return next.dailyAllowanceMinutes > prev.dailyAllowanceMinutes;
}

export function pruneUsage(usage: UsageState, challengeStartDate: string): UsageState {
  const dailyUsageSeconds: Record<string, number> = {};

  for (const [dateKey, seconds] of Object.entries(usage.dailyUsageSeconds)) {
    if (compareDateKeys(dateKey, challengeStartDate) >= 0) {
      dailyUsageSeconds[dateKey] = seconds;
    }
  }

  return { ...usage, dailyUsageSeconds };
}

export function normalizeSettings(stored: Partial<CommitmentSettings>): CommitmentSettings {
  return {
    challenge: {
      startDate: String(stored.challenge?.startDate ?? defaultSettings.challenge.startDate),
      endDate: String(stored.challenge?.endDate ?? defaultSettings.challenge.endDate)
    },
    blockedDomains: Array.isArray(stored.blockedDomains) ? stored.blockedDomains : [],
    dailyAttempts:
      stored.dailyAttempts && typeof stored.dailyAttempts === 'object' ? stored.dailyAttempts : {},
    workSchedule: isValidWorkSchedule(stored.workSchedule) ? stored.workSchedule : null,
    dailyAllowanceMinutes: normalizeAllowanceMinutes(stored.dailyAllowanceMinutes)
  };
}

function normalizeAllowanceMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(MAX_ALLOWANCE_MINUTES, Math.max(0, Math.floor(value)));
}

function normalizeUsage(stored: unknown): UsageState {
  if (!stored || typeof stored !== 'object') {
    return defaultUsage;
  }

  const usage = stored as Partial<UsageState>;
  const dailyUsageSeconds: Record<string, number> = {};

  if (usage.dailyUsageSeconds && typeof usage.dailyUsageSeconds === 'object') {
    for (const [dateKey, seconds] of Object.entries(usage.dailyUsageSeconds)) {
      if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
        dailyUsageSeconds[dateKey] = seconds;
      }
    }
  }

  return {
    dailyUsageSeconds,
    trackingState: isValidTrackingState(usage.trackingState) ? usage.trackingState : null
  };
}

function isValidTrackingState(value: unknown): value is TrackingState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<TrackingState>;

  return (
    typeof state.tabId === 'number' &&
    typeof state.windowId === 'number' &&
    typeof state.hostname === 'string' &&
    typeof state.startedAt === 'number' &&
    typeof state.dateKey === 'string'
  );
}

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function readLocalSettings(): Partial<CommitmentSettings> {
  if (typeof localStorage === 'undefined') {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem('commitment-settings');
    return stored ? JSON.parse(stored) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function readLocalUsage(): unknown {
  if (typeof localStorage === 'undefined') {
    return defaultUsage;
  }

  try {
    const stored = localStorage.getItem('commitment-usage');
    return stored ? JSON.parse(stored) : defaultUsage;
  } catch {
    return defaultUsage;
  }
}

function addDays(dateKey: string, offset: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return todayKey(date);
}
