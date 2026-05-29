const COMMON_SECOND_LEVEL_TLDS = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'com.br',
  'com.mx',
  'co.jp',
  'com.sg'
]);

export type DomainParseResult =
  | { ok: true; domain: string }
  | { ok: false; message: string };

export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

export function normalizeBlockedDomain(input: string): DomainParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, message: 'Enter a domain.' };
  }

  const hostname = extractHostname(trimmed);

  if (!hostname) {
    return { ok: false, message: 'Enter a valid domain.' };
  }

  if (hostname === 'localhost' || /^[\d.]+$/.test(hostname)) {
    return { ok: false, message: 'Use a website domain, not localhost or an IP address.' };
  }

  const labels = hostname.split('.');

  if (labels.length < 2 || labels.some((label) => !isValidLabel(label))) {
    return { ok: false, message: 'Enter a valid domain.' };
  }

  return { ok: true, domain: registrableDomain(hostname) };
}

export function matchesBlockedDomain(hostnameInput: string, blockedDomainInput: string): boolean {
  const hostname = normalizeHostname(hostnameInput);
  const blockedDomain = normalizeHostname(blockedDomainInput);

  return hostname === blockedDomain || hostname.endsWith(`.${blockedDomain}`);
}

export function isBlockedHostname(hostname: string, blockedDomains: string[]): boolean {
  return blockedDomains.some((domain) => matchesBlockedDomain(hostname, domain));
}

function extractHostname(input: string): string | null {
  const candidate = input.includes('://') ? input : `https://${input}`;

  try {
    return normalizeHostname(new URL(candidate).hostname.replace(/^www\./, ''));
  } catch {
    return null;
  }
}

function isValidLabel(label: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

function registrableDomain(hostname: string): string {
  const labels = hostname.split('.');

  if (labels.length <= 2) {
    return hostname;
  }

  const lastTwo = labels.slice(-2).join('.');
  const lastThree = labels.slice(-3).join('.');

  if (COMMON_SECOND_LEVEL_TLDS.has(lastTwo)) {
    return lastThree;
  }

  return lastTwo;
}
