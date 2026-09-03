import { describe, expect, it } from 'vitest';
import { UsageState, pruneUsage } from './storage';
import { flushTracking, startTracking, stopTracking, usedSecondsOn } from './tracking';

const emptyUsage: UsageState = {
  dailyUsageSeconds: {},
  trackingState: null
};

const target = { tabId: 7, windowId: 1, hostname: 'instagram.com' };

describe('flushTracking', () => {
  it('does nothing when nothing is tracked', () => {
    expect(flushTracking(emptyUsage, new Date(2026, 4, 11, 12, 0))).toEqual(emptyUsage);
  });

  it('credits elapsed time to the day tracking started and restarts the clock', () => {
    const started = new Date(2026, 4, 11, 12, 0, 0);
    const now = new Date(2026, 4, 11, 12, 0, 30);

    const tracking = startTracking(emptyUsage, target, started);
    const flushed = flushTracking(tracking, now);

    expect(flushed.dailyUsageSeconds).toEqual({ '2026-05-11': 30 });
    expect(flushed.trackingState).toEqual({
      ...target,
      startedAt: now.getTime(),
      dateKey: '2026-05-11'
    });
  });

  it('accumulates across repeated flushes', () => {
    const started = new Date(2026, 4, 11, 12, 0, 0);

    let usage = startTracking(emptyUsage, target, started);
    usage = flushTracking(usage, new Date(2026, 4, 11, 12, 0, 30));
    usage = flushTracking(usage, new Date(2026, 4, 11, 12, 1, 0));

    expect(usedSecondsOn(usage, '2026-05-11')).toBe(60);
  });

  it('clamps gaps longer than a minute (sleep or dead service worker)', () => {
    const started = new Date(2026, 4, 11, 12, 0, 0);
    const wokeUp = new Date(2026, 4, 11, 15, 30, 0);

    const tracking = startTracking(emptyUsage, target, started);
    const flushed = flushTracking(tracking, wokeUp);

    expect(usedSecondsOn(flushed, '2026-05-11')).toBe(60);
  });

  it('never credits negative time when the clock moves backwards', () => {
    const started = new Date(2026, 4, 11, 12, 0, 0);
    const earlier = new Date(2026, 4, 11, 11, 59, 0);

    const tracking = startTracking(emptyUsage, target, started);
    const flushed = flushTracking(tracking, earlier);

    expect(flushed.dailyUsageSeconds).toEqual({});
  });

  it('attributes a midnight rollover to the day tracking started, then re-keys', () => {
    const started = new Date(2026, 4, 11, 23, 59, 40);
    const afterMidnight = new Date(2026, 4, 12, 0, 0, 10);

    const tracking = startTracking(emptyUsage, target, started);
    const flushed = flushTracking(tracking, afterMidnight);

    expect(flushed.dailyUsageSeconds).toEqual({ '2026-05-11': 30 });
    expect(flushed.trackingState?.dateKey).toBe('2026-05-12');
  });
});

describe('startTracking / stopTracking', () => {
  it('records the tracked target with start time and date key', () => {
    const now = new Date(2026, 4, 11, 12, 0, 0);
    const usage = startTracking(emptyUsage, target, now);

    expect(usage.trackingState).toEqual({
      ...target,
      startedAt: now.getTime(),
      dateKey: '2026-05-11'
    });
  });

  it('clears the tracking state without touching accumulated usage', () => {
    const usage: UsageState = {
      dailyUsageSeconds: { '2026-05-11': 120 },
      trackingState: {
        ...target,
        startedAt: 0,
        dateKey: '2026-05-11'
      }
    };

    expect(stopTracking(usage)).toEqual({
      dailyUsageSeconds: { '2026-05-11': 120 },
      trackingState: null
    });
  });
});

describe('pruneUsage', () => {
  it('drops usage recorded before the challenge start', () => {
    const usage: UsageState = {
      dailyUsageSeconds: {
        '2026-05-09': 300,
        '2026-05-10': 100,
        '2026-05-11': 60
      },
      trackingState: null
    };

    expect(pruneUsage(usage, '2026-05-10').dailyUsageSeconds).toEqual({
      '2026-05-10': 100,
      '2026-05-11': 60
    });
  });
});
