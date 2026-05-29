import { describe, expect, it } from 'vitest';
import { buildActivityDays, getActivityTone } from './activity';

describe('getActivityTone', () => {
  it('uses clean, today, future, and attempt intensity states', () => {
    expect(getActivityTone('2026-05-27', 0, '2026-05-28')).toBe('clean');
    expect(getActivityTone('2026-05-28', 0, '2026-05-28')).toBe('today');
    expect(getActivityTone('2026-05-29', 0, '2026-05-28')).toBe('future');
    expect(getActivityTone('2026-05-28', 1, '2026-05-28')).toBe('level-1');
    expect(getActivityTone('2026-05-28', 3, '2026-05-28')).toBe('level-2');
    expect(getActivityTone('2026-05-28', 6, '2026-05-28')).toBe('level-3');
    expect(getActivityTone('2026-05-28', 7, '2026-05-28')).toBe('level-4');
  });
});

describe('buildActivityDays', () => {
  it('builds a tile model from challenge dates and attempts', () => {
    expect(buildActivityDays('2026-05-27', '2026-05-29', { '2026-05-28': 2 }, '2026-05-28')).toEqual([
      { date: '2026-05-27', count: 0, tone: 'clean' },
      { date: '2026-05-28', count: 2, tone: 'level-2' },
      { date: '2026-05-29', count: 0, tone: 'future' }
    ]);
  });
});
