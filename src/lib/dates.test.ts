import { describe, expect, it } from 'vitest';
import {
  daysLeft,
  enumerateDateKeys,
  getChallengeStatus,
  isChallengeActive,
  isValidIsoDate,
  timeLeft
} from './dates';

describe('date validation', () => {
  it('rejects impossible iso dates', () => {
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-02-28')).toBe(true);
  });
});

describe('challenge status', () => {
  const challenge = { startDate: '2026-05-10', endDate: '2026-05-20' };

  it('handles before, active, and after windows', () => {
    expect(getChallengeStatus(challenge, '2026-05-09')).toBe('before');
    expect(getChallengeStatus(challenge, '2026-05-10')).toBe('active');
    expect(getChallengeStatus(challenge, '2026-05-20')).toBe('active');
    expect(getChallengeStatus(challenge, '2026-05-21')).toBe('after');
  });

  it('calculates days left including today', () => {
    expect(daysLeft(challenge, '2026-05-10')).toBe(11);
    expect(daysLeft(challenge, '2026-05-20')).toBe(1);
    expect(daysLeft(challenge, '2026-05-21')).toBe(0);
  });

  it('only marks the active range as blocking', () => {
    expect(isChallengeActive(challenge, '2026-05-09')).toBe(false);
    expect(isChallengeActive(challenge, '2026-05-11')).toBe(true);
    expect(isChallengeActive(challenge, '2026-05-21')).toBe(false);
  });
});

describe('enumerateDateKeys', () => {
  it('returns one key per challenge day', () => {
    expect(enumerateDateKeys('2026-05-28', '2026-05-30')).toEqual([
      '2026-05-28',
      '2026-05-29',
      '2026-05-30'
    ]);
  });
});

describe('timeLeft', () => {
  const challenge = { startDate: '2026-05-10', endDate: '2026-05-20' };

  it('counts down to the end date before the challenge starts', () => {
    expect(timeLeft(challenge, new Date(2026, 4, 9, 12, 0, 0))).toEqual({
      days: 11,
      hours: 11,
      minutes: 59
    });
  });

  it('counts down during an active challenge', () => {
    expect(timeLeft(challenge, new Date(2026, 4, 10, 10, 15, 0))).toEqual({
      days: 10,
      hours: 13,
      minutes: 44
    });
  });

  it('keeps the final day active through the end of the day', () => {
    expect(timeLeft(challenge, new Date(2026, 4, 20, 9, 30, 0))).toEqual({
      days: 0,
      hours: 14,
      minutes: 29
    });
  });

  it('clamps expired challenges to zero', () => {
    expect(timeLeft(challenge, new Date(2026, 4, 21, 0, 0, 0))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0
    });
  });

  it('returns zero for invalid challenges', () => {
    expect(timeLeft({ startDate: '2026-05-20', endDate: '2026-05-10' })).toEqual({
      days: 0,
      hours: 0,
      minutes: 0
    });
  });
});
