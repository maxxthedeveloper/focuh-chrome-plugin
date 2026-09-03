import { describe, expect, it } from 'vitest';
import { decideAccess } from './decision';
import { CommitmentSettings } from './storage';

// 2026-05-11 is a Monday inside the challenge window.
const mondayNoon = new Date(2026, 4, 11, 12, 0);
const mondayEvening = new Date(2026, 4, 11, 20, 0);

const baseSettings: CommitmentSettings = {
  challenge: {
    startDate: '2026-05-10',
    endDate: '2026-05-19'
  },
  blockedDomains: ['instagram.com'],
  dailyAttempts: {},
  workSchedule: null,
  dailyAllowanceMinutes: 0
};

const weekdaySchedule = {
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60
};

describe('decideAccess', () => {
  it('is inactive when no challenge is running', () => {
    const settings = {
      ...baseSettings,
      challenge: { startDate: '2026-06-01', endDate: '2026-06-30' }
    };

    expect(decideAccess(settings, 0, mondayNoon)).toBe('inactive');
  });

  it('blocks 24/7 with no schedule and no allowance (legacy behavior)', () => {
    expect(decideAccess(baseSettings, 0, mondayNoon)).toBe('block');
    expect(decideAccess(baseSettings, 0, mondayEvening)).toBe('block');
  });

  it('allows tracked browsing with no schedule while allowance remains', () => {
    const settings = { ...baseSettings, dailyAllowanceMinutes: 15 };

    expect(decideAccess(settings, 14 * 60 + 59, mondayNoon)).toBe('allow-tracked');
  });

  it('blocks with no schedule once the allowance is used up', () => {
    const settings = { ...baseSettings, dailyAllowanceMinutes: 15 };

    expect(decideAccess(settings, 15 * 60, mondayNoon)).toBe('block');
  });

  it('is free outside work hours regardless of allowance', () => {
    const settings = { ...baseSettings, workSchedule: weekdaySchedule };

    expect(decideAccess(settings, 0, mondayEvening)).toBe('free');
    expect(
      decideAccess({ ...settings, dailyAllowanceMinutes: 15 }, 15 * 60, mondayEvening)
    ).toBe('free');
  });

  it('blocks inside work hours with no allowance', () => {
    const settings = { ...baseSettings, workSchedule: weekdaySchedule };

    expect(decideAccess(settings, 0, mondayNoon)).toBe('block');
  });

  it('allows tracked browsing inside work hours while allowance remains', () => {
    const settings = {
      ...baseSettings,
      workSchedule: weekdaySchedule,
      dailyAllowanceMinutes: 15
    };

    expect(decideAccess(settings, 0, mondayNoon)).toBe('allow-tracked');
  });

  it('blocks inside work hours once the allowance is used up', () => {
    const settings = {
      ...baseSettings,
      workSchedule: weekdaySchedule,
      dailyAllowanceMinutes: 15
    };

    expect(decideAccess(settings, 15 * 60, mondayNoon)).toBe('block');
  });
});
