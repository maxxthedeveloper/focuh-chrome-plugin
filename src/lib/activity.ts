import { compareDateKeys, enumerateDateKeys, todayKey } from './dates';

export type ActivityTone = 'future' | 'today' | 'clean' | 'level-1' | 'level-2' | 'level-3' | 'level-4';

export interface ActivityDay {
  date: string;
  count: number;
  tone: ActivityTone;
}

export function buildActivityDays(
  startDate: string,
  endDate: string,
  dailyAttempts: Record<string, number>,
  today = todayKey()
): ActivityDay[] {
  return enumerateDateKeys(startDate, endDate).map((date) => {
    const count = dailyAttempts[date] ?? 0;

    return {
      date,
      count,
      tone: getActivityTone(date, count, today)
    };
  });
}

export function getActivityTone(date: string, count: number, today = todayKey()): ActivityTone {
  if (compareDateKeys(date, today) > 0) {
    return 'future';
  }

  if (count === 0) {
    return date === today ? 'today' : 'clean';
  }

  if (count === 1) {
    return 'level-1';
  }

  if (count <= 3) {
    return 'level-2';
  }

  if (count <= 6) {
    return 'level-3';
  }

  return 'level-4';
}
