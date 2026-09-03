import { todayKey } from './dates';
import { TrackingState, UsageState } from './storage';

/**
 * A live tracker is flushed at least every 30s by the usage alarm, so any
 * larger gap means the machine slept or the service worker died without
 * events. Clamping bounds overcounting to at most one minute.
 */
export const MAX_CREDIT_MS = 60_000;

export const USAGE_ALARM_NAME = 'focuh-usage-tick';
export const USAGE_ALARM_PERIOD_MINUTES = 0.5;

/**
 * Credits elapsed tracked time to the day tracking started and restarts the
 * clock at `now`. Returns the usage unchanged when nothing is being tracked.
 */
export function flushTracking(usage: UsageState, now = new Date()): UsageState {
  const state = usage.trackingState;

  if (!state) {
    return usage;
  }

  const elapsedMs = Math.min(Math.max(now.getTime() - state.startedAt, 0), MAX_CREDIT_MS);
  const elapsedSeconds = Math.round(elapsedMs / 1000);

  const dailyUsageSeconds =
    elapsedSeconds > 0
      ? {
          ...usage.dailyUsageSeconds,
          [state.dateKey]: (usage.dailyUsageSeconds[state.dateKey] ?? 0) + elapsedSeconds
        }
      : usage.dailyUsageSeconds;

  return {
    dailyUsageSeconds,
    trackingState: {
      ...state,
      startedAt: now.getTime(),
      dateKey: todayKey(now)
    }
  };
}

export function startTracking(
  usage: UsageState,
  target: { tabId: number; windowId: number; hostname: string },
  now = new Date()
): UsageState {
  const trackingState: TrackingState = {
    tabId: target.tabId,
    windowId: target.windowId,
    hostname: target.hostname,
    startedAt: now.getTime(),
    dateKey: todayKey(now)
  };

  return { ...usage, trackingState };
}

export function stopTracking(usage: UsageState): UsageState {
  if (!usage.trackingState) {
    return usage;
  }

  return { ...usage, trackingState: null };
}

export function usedSecondsOn(usage: UsageState, dateKey = todayKey()): number {
  return usage.dailyUsageSeconds[dateKey] ?? 0;
}
