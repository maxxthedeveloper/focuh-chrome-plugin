import { describe, expect, it } from 'vitest';
import {
  WorkSchedule,
  isValidWorkSchedule,
  isWithinWorkHours,
  minuteToTimeValue,
  timeValueToMinute
} from './schedule';

const weekdaySchedule: WorkSchedule = {
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60
};

// 2026-05-11 is a Monday, 2026-05-10 is a Sunday.
const monday = (hours: number, minutes = 0) => new Date(2026, 4, 11, hours, minutes);
const sunday = (hours: number, minutes = 0) => new Date(2026, 4, 10, hours, minutes);

describe('isWithinWorkHours', () => {
  it('always matches when there is no schedule', () => {
    expect(isWithinWorkHours(null, sunday(3, 30))).toBe(true);
  });

  it('matches inside the window on a scheduled day', () => {
    expect(isWithinWorkHours(weekdaySchedule, monday(12))).toBe(true);
  });

  it('does not match on an unscheduled day even inside the hours', () => {
    expect(isWithinWorkHours(weekdaySchedule, sunday(12))).toBe(false);
  });

  it('matches Sundays when day 0 is scheduled', () => {
    expect(isWithinWorkHours({ ...weekdaySchedule, days: [0] }, sunday(12))).toBe(true);
  });

  it('includes the start minute', () => {
    expect(isWithinWorkHours(weekdaySchedule, monday(9, 0))).toBe(true);
  });

  it('excludes the end minute', () => {
    expect(isWithinWorkHours(weekdaySchedule, monday(17, 0))).toBe(false);
  });

  it('does not match before the window starts', () => {
    expect(isWithinWorkHours(weekdaySchedule, monday(8, 59))).toBe(false);
  });
});

describe('isValidWorkSchedule', () => {
  it('accepts a well-formed schedule', () => {
    expect(isValidWorkSchedule(weekdaySchedule)).toBe(true);
  });

  it('rejects non-objects', () => {
    expect(isValidWorkSchedule(null)).toBe(false);
    expect(isValidWorkSchedule('9-17')).toBe(false);
  });

  it('rejects an empty day list', () => {
    expect(isValidWorkSchedule({ ...weekdaySchedule, days: [] })).toBe(false);
  });

  it('rejects out-of-range days', () => {
    expect(isValidWorkSchedule({ ...weekdaySchedule, days: [7] })).toBe(false);
    expect(isValidWorkSchedule({ ...weekdaySchedule, days: [-1] })).toBe(false);
  });

  it('rejects a window that does not end after it starts', () => {
    expect(isValidWorkSchedule({ ...weekdaySchedule, startMinute: 600, endMinute: 600 })).toBe(false);
    expect(isValidWorkSchedule({ ...weekdaySchedule, startMinute: 600, endMinute: 540 })).toBe(false);
  });

  it('rejects out-of-range minutes', () => {
    expect(isValidWorkSchedule({ ...weekdaySchedule, endMinute: 1440 })).toBe(false);
    expect(isValidWorkSchedule({ ...weekdaySchedule, startMinute: -10 })).toBe(false);
    expect(isValidWorkSchedule({ ...weekdaySchedule, startMinute: 9.5 })).toBe(false);
  });
});

describe('time value conversion', () => {
  it('round-trips minutes through the input format', () => {
    expect(minuteToTimeValue(9 * 60)).toBe('09:00');
    expect(minuteToTimeValue(17 * 60 + 5)).toBe('17:05');
    expect(timeValueToMinute('09:00')).toBe(9 * 60);
    expect(timeValueToMinute('23:59')).toBe(23 * 60 + 59);
  });

  it('rejects malformed time values', () => {
    expect(timeValueToMinute('9:00')).toBeNull();
    expect(timeValueToMinute('24:00')).toBeNull();
    expect(timeValueToMinute('')).toBeNull();
  });
});
