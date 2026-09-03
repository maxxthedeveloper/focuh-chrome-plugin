import { describe, expect, it } from 'vitest';
import {
  CommitmentSettings,
  isLoosening,
  normalizeSettings,
  removeBlockedDomainFromSettings,
  restartChallenge
} from './storage';

const activeSettings: CommitmentSettings = {
  challenge: {
    startDate: '2026-05-10',
    endDate: '2026-05-19'
  },
  blockedDomains: ['instagram.com', 'youtube.com', 'x.com'],
  dailyAttempts: {
    '2026-05-11': 2,
    '2026-05-12': 1
  },
  workSchedule: null,
  dailyAllowanceMinutes: 0
};

const weekdaySchedule = {
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60
};

describe('removeBlockedDomainFromSettings', () => {
  it('removes a domain and restarts the challenge with the same original length', () => {
    expect(
      removeBlockedDomainFromSettings(activeSettings, 'youtube.com', {
        restartChallenge: true,
        today: '2026-05-15'
      })
    ).toEqual({
      ...activeSettings,
      challenge: {
        startDate: '2026-05-15',
        endDate: '2026-05-24'
      },
      blockedDomains: ['instagram.com', 'x.com'],
      dailyAttempts: {}
    });
  });

  it('removes a domain without changing challenge progress when restart is not requested', () => {
    expect(
      removeBlockedDomainFromSettings(activeSettings, 'youtube.com', {
        restartChallenge: false,
        today: '2026-05-15'
      })
    ).toEqual({
      ...activeSettings,
      blockedDomains: ['instagram.com', 'x.com']
    });
  });

  it('keeps settings stable when the domain is not in the blocklist', () => {
    expect(removeBlockedDomainFromSettings(activeSettings, 'reddit.com')).toEqual(activeSettings);
  });
});

describe('restartChallenge', () => {
  it('restarts at the given day, keeps the length, and clears attempts', () => {
    expect(restartChallenge(activeSettings, '2026-05-15')).toEqual({
      ...activeSettings,
      challenge: {
        startDate: '2026-05-15',
        endDate: '2026-05-24'
      },
      dailyAttempts: {}
    });
  });
});

describe('normalizeSettings', () => {
  it('upgrades legacy stored settings to 24/7 blocking with no allowance', () => {
    const legacy = {
      challenge: activeSettings.challenge,
      blockedDomains: activeSettings.blockedDomains,
      dailyAttempts: activeSettings.dailyAttempts
    };

    expect(normalizeSettings(legacy)).toEqual(activeSettings);
  });

  it('drops a malformed work schedule', () => {
    const stored = {
      ...activeSettings,
      workSchedule: { days: [], startMinute: 540, endMinute: 480 }
    };

    expect(normalizeSettings(stored).workSchedule).toBeNull();
  });

  it('keeps a valid work schedule', () => {
    const stored = { ...activeSettings, workSchedule: weekdaySchedule };

    expect(normalizeSettings(stored).workSchedule).toEqual(weekdaySchedule);
  });

  it('clamps the daily allowance to a whole number of minutes within a day', () => {
    expect(
      normalizeSettings({ ...activeSettings, dailyAllowanceMinutes: 15.9 }).dailyAllowanceMinutes
    ).toBe(15);
    expect(
      normalizeSettings({ ...activeSettings, dailyAllowanceMinutes: -5 }).dailyAllowanceMinutes
    ).toBe(0);
    expect(
      normalizeSettings({ ...activeSettings, dailyAllowanceMinutes: 99999 }).dailyAllowanceMinutes
    ).toBe(1440);
    expect(
      normalizeSettings({
        ...activeSettings,
        dailyAllowanceMinutes: Number.NaN
      }).dailyAllowanceMinutes
    ).toBe(0);
  });
});

describe('isLoosening', () => {
  it('treats enabling a work schedule as loosening', () => {
    expect(isLoosening(activeSettings, { ...activeSettings, workSchedule: weekdaySchedule })).toBe(
      true
    );
  });

  it('treats editing an existing schedule as loosening', () => {
    const prev = { ...activeSettings, workSchedule: weekdaySchedule };
    const next = {
      ...activeSettings,
      workSchedule: { ...weekdaySchedule, endMinute: 16 * 60 }
    };

    expect(isLoosening(prev, next)).toBe(true);
  });

  it('treats removing the schedule as tightening', () => {
    const prev = { ...activeSettings, workSchedule: weekdaySchedule };

    expect(isLoosening(prev, { ...activeSettings, workSchedule: null })).toBe(false);
  });

  it('treats raising the allowance as loosening and lowering it as tightening', () => {
    const withAllowance = { ...activeSettings, dailyAllowanceMinutes: 15 };

    expect(isLoosening(activeSettings, withAllowance)).toBe(true);
    expect(isLoosening(withAllowance, { ...activeSettings, dailyAllowanceMinutes: 5 })).toBe(false);
    expect(isLoosening(withAllowance, activeSettings)).toBe(false);
  });

  it('treats unchanged rules as tightening-safe', () => {
    expect(isLoosening(activeSettings, { ...activeSettings, blockedDomains: [] })).toBe(false);
  });
});
