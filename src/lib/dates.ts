export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ChallengeStatus = 'before' | 'active' | 'after' | 'invalid';

export interface Challenge {
  startDate: string;
  endDate: string;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = parseDateKey(value);
  return todayKey(date) === value;
}

export function compareDateKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

export function getChallengeStatus(challenge: Challenge, today = todayKey()): ChallengeStatus {
  if (!isValidChallenge(challenge)) {
    return 'invalid';
  }

  if (compareDateKeys(today, challenge.startDate) < 0) {
    return 'before';
  }

  if (compareDateKeys(today, challenge.endDate) > 0) {
    return 'after';
  }

  return 'active';
}

export function isChallengeActive(challenge: Challenge, today = todayKey()): boolean {
  return getChallengeStatus(challenge, today) === 'active';
}

export function isValidChallenge(challenge: Challenge): boolean {
  return (
    isValidIsoDate(challenge.startDate) &&
    isValidIsoDate(challenge.endDate) &&
    compareDateKeys(challenge.startDate, challenge.endDate) <= 0
  );
}

export function daysBetweenInclusive(startDate: string, endDate: string): number {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  return Math.floor((end.getTime() - start.getTime()) / msPerDay()) + 1;
}

export function daysLeft(challenge: Challenge, today = todayKey()): number {
  if (!isValidChallenge(challenge)) {
    return 0;
  }

  if (compareDateKeys(today, challenge.startDate) < 0) {
    return daysBetweenInclusive(challenge.startDate, challenge.endDate);
  }

  if (compareDateKeys(today, challenge.endDate) > 0) {
    return 0;
  }

  return daysBetweenInclusive(today, challenge.endDate);
}

export function timeLeft(challenge: Challenge, now = new Date()): TimeLeft {
  if (!isValidChallenge(challenge)) {
    return zeroTimeLeft();
  }

  const end = parseDateKey(challenge.endDate);
  end.setHours(23, 59, 59, 999);

  const remaining = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(remaining / msPerDay());
  const hours = Math.floor((remaining % msPerDay()) / msPerHour());
  const minutes = Math.floor((remaining % msPerHour()) / msPerMinute());

  return { days, hours, minutes };
}

export function enumerateDateKeys(startDate: string, endDate: string): string[] {
  if (!isValidChallenge({ startDate, endDate })) {
    return [];
  }

  const keys: string[] = [];
  const cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor.getTime() <= end.getTime()) {
    keys.push(todayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function formatDisplayDate(dateKey: string): string {
  if (!isValidIsoDate(dateKey)) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parseDateKey(dateKey));
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function msPerDay(): number {
  return 24 * 60 * 60 * 1000;
}

function msPerHour(): number {
  return 60 * 60 * 1000;
}

function msPerMinute(): number {
  return 60 * 1000;
}

function zeroTimeLeft(): TimeLeft {
  return { days: 0, hours: 0, minutes: 0 };
}
