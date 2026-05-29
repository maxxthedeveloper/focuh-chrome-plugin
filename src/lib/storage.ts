import { Challenge, todayKey } from './dates';

export interface CommitmentSettings {
  challenge: Challenge;
  blockedDomains: string[];
  dailyAttempts: Record<string, number>;
}

const today = todayKey();

export const defaultSettings: CommitmentSettings = {
  challenge: {
    startDate: today,
    endDate: today
  },
  blockedDomains: [],
  dailyAttempts: {}
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

function normalizeSettings(stored: Partial<CommitmentSettings>): CommitmentSettings {
  return {
    challenge: {
      startDate: String(stored.challenge?.startDate ?? defaultSettings.challenge.startDate),
      endDate: String(stored.challenge?.endDate ?? defaultSettings.challenge.endDate)
    },
    blockedDomains: Array.isArray(stored.blockedDomains) ? stored.blockedDomains : [],
    dailyAttempts:
      stored.dailyAttempts && typeof stored.dailyAttempts === 'object' ? stored.dailyAttempts : {}
  };
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
