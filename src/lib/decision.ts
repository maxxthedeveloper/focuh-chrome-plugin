import { isChallengeActive, todayKey } from './dates';
import { isWithinWorkHours } from './schedule';
import { CommitmentSettings } from './storage';

export type AccessDecision = 'inactive' | 'free' | 'allow-tracked' | 'block';

export function allowanceSeconds(settings: CommitmentSettings): number {
  return settings.dailyAllowanceMinutes * 60;
}

export function decideAccess(
  settings: CommitmentSettings,
  usedSecondsToday: number,
  now = new Date()
): AccessDecision {
  if (!isChallengeActive(settings.challenge, todayKey(now))) {
    return 'inactive';
  }

  if (!isWithinWorkHours(settings.workSchedule, now)) {
    return 'free';
  }

  if (settings.dailyAllowanceMinutes <= 0) {
    return 'block';
  }

  return usedSecondsToday < allowanceSeconds(settings) ? 'allow-tracked' : 'block';
}
