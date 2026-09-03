export interface WorkSchedule {
  /** Days of the week using the Date.getDay() convention: 0=Sun … 6=Sat. */
  days: number[];
  /** Minutes from local midnight, 0–1439. */
  startMinute: number;
  /** Minutes from local midnight; must be greater than startMinute. */
  endMinute: number;
}

export const MINUTES_PER_DAY = 24 * 60;

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  days: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 17 * 60
};

export function isValidWorkSchedule(value: unknown): value is WorkSchedule {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const schedule = value as Partial<WorkSchedule>;

  return (
    Array.isArray(schedule.days) &&
    schedule.days.length > 0 &&
    schedule.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    isMinuteOfDay(schedule.startMinute) &&
    isMinuteOfDay(schedule.endMinute) &&
    schedule.endMinute! > schedule.startMinute!
  );
}

export function isWithinWorkHours(schedule: WorkSchedule | null, now = new Date()): boolean {
  if (!schedule) {
    return true;
  }

  if (!schedule.days.includes(now.getDay())) {
    return false;
  }

  const minute = now.getHours() * 60 + now.getMinutes();
  return minute >= schedule.startMinute && minute < schedule.endMinute;
}

export function minuteToTimeValue(minute: number): string {
  const hours = String(Math.floor(minute / 60)).padStart(2, '0');
  const minutes = String(minute % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function timeValueToMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const minute = Number(match[1]) * 60 + Number(match[2]);
  return isMinuteOfDay(minute) ? minute : null;
}

function isMinuteOfDay(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < MINUTES_PER_DAY;
}
