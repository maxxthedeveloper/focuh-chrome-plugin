import { describe, expect, it } from 'vitest';
import { isBlockedHostname, matchesBlockedDomain, normalizeBlockedDomain } from './domain';

describe('normalizeBlockedDomain', () => {
  it('normalizes pasted urls to a registrable domain', () => {
    expect(normalizeBlockedDomain('https://www.youtube.com/watch?v=abc')).toEqual({
      ok: true,
      domain: 'youtube.com'
    });
  });

  it('keeps known second-level public suffixes intact', () => {
    expect(normalizeBlockedDomain('https://news.bbc.co.uk')).toEqual({
      ok: true,
      domain: 'bbc.co.uk'
    });
  });

  it('rejects ips and localhost', () => {
    expect(normalizeBlockedDomain('localhost').ok).toBe(false);
    expect(normalizeBlockedDomain('127.0.0.1').ok).toBe(false);
  });
});

describe('matchesBlockedDomain', () => {
  it('matches exact domains and subdomains', () => {
    expect(matchesBlockedDomain('youtube.com', 'youtube.com')).toBe(true);
    expect(matchesBlockedDomain('m.youtube.com', 'youtube.com')).toBe(true);
  });

  it('does not match unrelated suffixes', () => {
    expect(matchesBlockedDomain('notyoutube.com', 'youtube.com')).toBe(false);
    expect(isBlockedHostname('work.com', ['youtube.com', 'x.com'])).toBe(false);
  });
});
