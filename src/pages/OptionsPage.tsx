import { Button } from '@base-ui/react/button';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Check, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { cn } from '../lib/cn';
import {
  daysBetweenInclusive,
  daysLeft,
  formatDisplayDate,
  getChallengeStatus,
  isValidChallenge,
  todayKey,
} from '../lib/dates';
import { normalizeBlockedDomain } from '../lib/domain';
import { CommitmentSettings, getSettings, saveSettings } from '../lib/storage';

const minChallengeDays = 1;
const maxChallengeDays = 365;
const defaultChallengeDays = 91;
const presetDays = [30, 91, 180];

export function OptionsPage() {
  const [settings, setSettings] = useState<CommitmentSettings | null>(null);
  const [daysInput, setDaysInput] = useState(String(defaultChallengeDays));
  const [durationError, setDurationError] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState('');
  const [created, setCreated] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  useEffect(() => {
    void getSettings().then((storedSettings) => {
      setSettings(storedSettings);
      setDaysInput(String(getInitialDuration(storedSettings)));
    });
  }, []);

  const duration = parseDuration(daysInput);
  const preview = useMemo(() => {
    if (!duration) return null;
    const startDate = todayKey();
    const endDate = addDays(startDate, duration - 1);
    return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  }, [duration]);

  if (!settings) {
    return <div className="min-h-screen bg-[var(--color-canvas)]" />;
  }

  const currentSettings = settings;
  const status = getChallengeStatus(currentSettings.challenge);
  const activeChallenge = status === 'active' && !isDefaultChallengePlaceholder(currentSettings);
  const remainingDays = daysLeft(currentSettings.challenge);
  const totalDays = isValidChallenge(currentSettings.challenge)
    ? daysBetweenInclusive(currentSettings.challenge.startDate, currentSettings.challenge.endDate)
    : 0;
  const currentRange = isValidChallenge(currentSettings.challenge)
    ? `${formatDisplayDate(currentSettings.challenge.startDate)} – ${formatDisplayDate(currentSettings.challenge.endDate)}`
    : '';

  function updateDays(value: string) {
    setDaysInput(value);
    setDurationError('');
    setCreated(false);
  }

  async function createChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!duration) {
      setDurationError(`Choose ${minChallengeDays}–${maxChallengeDays} days.`);
      setCreated(false);
      return;
    }

    const startDate = todayKey();
    const nextSettings: CommitmentSettings = {
      ...currentSettings,
      challenge: { startDate, endDate: addDays(startDate, duration - 1) },
      dailyAttempts: {},
    };

    await saveSettings(nextSettings);
    setSettings(nextSettings);
    setDurationError('');
    setResetArmed(false);
    setCreated(true);
    window.setTimeout(() => setCreated(false), 1800);
  }

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = normalizeBlockedDomain(domainInput);

    if (!parsed.ok) {
      setDomainError(parsed.message);
      return;
    }

    if (currentSettings.blockedDomains.includes(parsed.domain)) {
      setDomainError('That domain is already blocked.');
      return;
    }

    const nextSettings: CommitmentSettings = {
      ...currentSettings,
      blockedDomains: [...currentSettings.blockedDomains, parsed.domain].sort(),
    };

    await saveSettings(nextSettings);
    setSettings(nextSettings);
    setDomainInput('');
    setDomainError('');
  }

  async function removeDomain(domain: string) {
    const nextSettings: CommitmentSettings = {
      ...currentSettings,
      blockedDomains: currentSettings.blockedDomains.filter((d) => d !== domain),
    };
    await saveSettings(nextSettings);
    setSettings(nextSettings);
    setDomainError('');
  }

  const sharedDomainProps = {
    domains: currentSettings.blockedDomains,
    domainInput,
    domainError,
    onDomainInputChange: (value: string) => {
      setDomainInput(value);
      setDomainError('');
    },
    onAddDomain: addDomain,
    onRemoveDomain: (domain: string) => void removeDomain(domain),
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-6 text-[var(--color-text-primary)] sm:px-10">
      <div className="mx-auto flex min-h-screen w-full max-w-[540px] flex-col justify-center py-12 sm:py-16">
        {activeChallenge ? (
          <ActiveView
            remainingDays={remainingDays}
            totalDays={totalDays}
            currentRange={currentRange}
            daysInput={daysInput}
            durationError={durationError}
            resetArmed={resetArmed}
            created={created}
            preview={preview}
            onStartOver={() => setResetArmed(true)}
            onCancelStartOver={() => {
              setResetArmed(false);
              setDurationError('');
            }}
            onDaysChange={updateDays}
            onSubmit={createChallenge}
            domainProps={sharedDomainProps}
          />
        ) : (
          <CreateView
            daysInput={daysInput}
            durationError={durationError}
            created={created}
            preview={preview}
            onDaysChange={updateDays}
            onSubmit={createChallenge}
            domainProps={sharedDomainProps}
          />
        )}
      </div>
    </main>
  );
}

// ─── State 1: No active challenge ────────────────────────────────────────────

function CreateView({
  daysInput,
  durationError,
  created,
  preview,
  onDaysChange,
  onSubmit,
  domainProps,
}: {
  daysInput: string;
  durationError: string;
  created: boolean;
  preview: string | null;
  onDaysChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  domainProps: DomainSettingsProps;
}) {
  return (
    <>
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
          focuh
        </p>
        <h1 className="mt-4 text-[38px] font-semibold leading-[1.05] tracking-tight [text-wrap:balance] sm:text-[48px]">
          Create a challenge
        </h1>
      </header>

      <form className="mt-14" onSubmit={onSubmit}>
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
          Duration
        </p>

        <DayPresets daysInput={daysInput} onDaysChange={onDaysChange} />

        <DurationInput
          daysInput={daysInput}
          durationError={durationError}
          onDaysChange={onDaysChange}
          describedBy="challenge-preview"
          size="lg"
        />

        <p
          id="challenge-preview"
          aria-live="polite"
          className="mt-4 min-h-5 text-center text-[14px] leading-5 text-[var(--color-text-tertiary)] [text-wrap:pretty]"
        >
          {preview ?? ''}
        </p>

        <PrimaryButton created={created} label="Create challenge" createdLabel="Challenge created" />
      </form>

      <DomainSettings {...domainProps} />
    </>
  );
}

// ─── State 2: Active challenge ────────────────────────────────────────────────

function ActiveView({
  remainingDays,
  totalDays,
  currentRange,
  daysInput,
  durationError,
  resetArmed,
  created,
  preview,
  onStartOver,
  onCancelStartOver,
  onDaysChange,
  onSubmit,
  domainProps,
}: {
  remainingDays: number;
  totalDays: number;
  currentRange: string;
  daysInput: string;
  durationError: string;
  resetArmed: boolean;
  created: boolean;
  preview: string | null;
  onStartOver: () => void;
  onCancelStartOver: () => void;
  onDaysChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  domainProps: DomainSettingsProps;
}) {
  return (
    <>
      {/* Hero: days remaining */}
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
          focuh
        </p>
        <div className="mt-10 flex items-baseline justify-center">
          <span className="tabular-nums text-[88px] font-semibold leading-none sm:text-[104px]">
            {remainingDays}
          </span>
          <span className="ml-3 text-[22px] font-medium leading-none text-[var(--color-text-tertiary)]">
            {remainingDays === 1 ? 'day left' : 'days left'}
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-5 text-[var(--color-text-tertiary)]">
          {currentRange}
          {totalDays > 0 && <span className="ml-2 opacity-50">· {totalDays} days</span>}
        </p>
      </header>

      <DomainSettings {...domainProps} />

      {/* Start over — progressive disclosure */}
      <div className="mt-10 border-t border-[var(--color-border)] pt-8">
        {resetArmed ? (
          <form onSubmit={onSubmit}>
            <p className="mb-7 text-center text-[13px] leading-5 text-[var(--color-text-tertiary)] [text-wrap:balance]">
              Starting over will clear all progress on this challenge.
            </p>

            <DayPresets daysInput={daysInput} onDaysChange={onDaysChange} />

            <DurationInput
              daysInput={daysInput}
              durationError={durationError}
              onDaysChange={onDaysChange}
              describedBy="reset-preview"
              size="md"
            />

            <p
              id="reset-preview"
              aria-live="polite"
              className="mt-3 min-h-5 text-center text-[14px] leading-5 text-[var(--color-text-tertiary)]"
            >
              {preview ?? ''}
            </p>

            <Button
              type="submit"
              className={cn(
                'mx-auto mt-6 flex min-h-[52px] w-full max-w-[320px] items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold',
                'transition-[filter,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)]',
                'bg-[var(--color-danger)] text-white hover:brightness-90',
                'focus:outline-none focus:ring-4 focus:ring-[var(--color-danger-soft)] active:scale-[0.97]',
              )}
            >
              <span className="relative size-[18px] shrink-0" aria-hidden="true">
                <Check
                  size={18}
                  strokeWidth={2.5}
                  className={cn(
                    'absolute inset-0 transition-[filter,opacity,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
                    created ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
                  )}
                />
              </span>
              <span>{created ? 'Challenge restarted' : 'Start new challenge'}</span>
            </Button>

            <button
              type="button"
              onClick={onCancelStartOver}
              className="mx-auto mt-4 block text-[14px] text-[var(--color-text-tertiary)] transition hover:text-[var(--color-text-primary)] focus:outline-none"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="text-center">
            <button
              type="button"
              onClick={onStartOver}
              className="text-[14px] text-[var(--color-danger)] opacity-50 transition-opacity hover:opacity-100 focus:outline-none"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function DayPresets({
  daysInput,
  onDaysChange,
}: {
  daysInput: string;
  onDaysChange: (v: string) => void;
}) {
  const activePreset = presetDays.includes(Number(daysInput)) ? daysInput : '';

  return (
    <div className="mt-5 flex justify-center">
      <ToggleGroup
        value={activePreset ? [activePreset] : []}
        onValueChange={(vals) => {
          if (vals.length > 0) onDaysChange(vals[0]);
        }}
        className="inline-flex gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
      >
        {presetDays.map((d) => (
          <Toggle
            key={d}
            value={String(d)}
            className={cn(
              'min-w-[80px] rounded-xl px-6 py-2.5 text-[15px] font-semibold tabular-nums',
              'cursor-pointer select-none transition-all duration-150',
              'text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
              'data-[pressed]:bg-[var(--color-text-primary)] data-[pressed]:text-[var(--color-canvas)]',
              'data-[pressed]:shadow-sm',
            )}
          >
            {d}
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}

function DurationInput({
  daysInput,
  durationError,
  onDaysChange,
  describedBy,
  size,
}: {
  daysInput: string;
  durationError: string;
  onDaysChange: (v: string) => void;
  describedBy: string;
  size: 'lg' | 'md';
}) {
  return (
    <Field.Root invalid={Boolean(durationError)}>
      <Field.Label className="sr-only">Days</Field.Label>
      <div className="mt-8 flex items-baseline justify-center">
        <Input
          type="number"
          inputMode="numeric"
          min={minChallengeDays}
          max={maxChallengeDays}
          value={daysInput}
          onChange={(e) => onDaysChange(e.target.value)}
          className={cn(
            'w-[4ch] appearance-none bg-transparent text-center font-semibold leading-none',
            'text-[var(--color-text-primary)] outline-none selection:bg-[var(--color-accent-soft)] tabular-nums',
            size === 'lg' ? 'text-[88px] sm:text-[104px]' : 'text-[72px]',
          )}
          aria-describedby={describedBy}
        />
        <span
          className={cn(
            'ml-2 font-medium leading-none text-[var(--color-text-tertiary)]',
            size === 'lg' ? 'text-[26px]' : 'text-[22px]',
          )}
        >
          days
        </span>
      </div>
      {durationError ? (
        <Field.Error className="mt-4 block text-center text-[13px] leading-5 text-[var(--color-danger)]">
          {durationError}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}

function PrimaryButton({
  created,
  label,
  createdLabel,
}: {
  created: boolean;
  label: string;
  createdLabel: string;
}) {
  return (
    <Button
      type="submit"
      className={cn(
        'mx-auto mt-8 flex min-h-[52px] w-full max-w-[320px] items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold',
        'transition-[filter,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)]',
        'bg-[var(--color-accent)] text-white hover:brightness-[0.95]',
        'focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] active:scale-[0.97]',
      )}
    >
      <span className="relative size-[18px] shrink-0" aria-hidden="true">
        <Check
          size={18}
          strokeWidth={2.5}
          className={cn(
            'absolute inset-0 transition-[filter,opacity,scale] duration-200 ease-[cubic-bezier(0.2,0,0,1)]',
            created ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
          )}
        />
      </span>
      <span>{created ? createdLabel : label}</span>
    </Button>
  );
}

type DomainSettingsProps = {
  domains: string[];
  domainInput: string;
  domainError: string;
  onDomainInputChange: (value: string) => void;
  onAddDomain: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveDomain: (domain: string) => void;
};

function DomainSettings({
  domains,
  domainInput,
  domainError,
  onDomainInputChange,
  onAddDomain,
  onRemoveDomain,
}: DomainSettingsProps) {
  return (
    <section className="mt-14 border-t border-[var(--color-border)] pt-10">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)]">
          Blocked domains
        </p>
        {domains.length > 0 && (
          <span className="tabular-nums text-[13px] font-medium text-[var(--color-text-tertiary)]">
            {domains.length}
          </span>
        )}
      </div>

      <form className="mt-5" onSubmit={onAddDomain}>
        <Field.Root invalid={Boolean(domainError)}>
          <Field.Label className="sr-only">Website</Field.Label>
          <div className="flex gap-2">
            <Input
              value={domainInput}
              onChange={(e) => onDomainInputChange(e.target.value)}
              placeholder="youtube.com"
              className="h-11 min-w-0 flex-1 rounded-full border border-[var(--color-border)] bg-[var(--color-field)] px-5 text-[15px] leading-5 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
            />
            <Button
              type="submit"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-primary)] text-[var(--color-canvas)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] active:scale-[0.96]"
              aria-label="Add domain"
            >
              <Plus size={18} strokeWidth={2.5} />
            </Button>
          </div>
          {domainError ? (
            <Field.Error className="mt-3 block text-[13px] leading-5 text-[var(--color-danger)]">
              {domainError}
            </Field.Error>
          ) : null}
        </Field.Root>
      </form>

      <div className="mt-5 divide-y divide-[var(--color-border)]">
        {domains.map((domain) => (
          <div key={domain} className="flex min-h-12 items-center justify-between gap-4">
            <span className="min-w-0 truncate text-[15px] font-medium leading-6">{domain}</span>
            <Button
              type="button"
              onClick={() => onRemoveDomain(domain)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)]"
              aria-label={`Remove ${domain}`}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitialDuration(settings: CommitmentSettings): number {
  if (!isValidChallenge(settings.challenge)) return defaultChallengeDays;
  if (isDefaultChallengePlaceholder(settings)) return defaultChallengeDays;
  return clamp(
    daysBetweenInclusive(settings.challenge.startDate, settings.challenge.endDate),
    minChallengeDays,
    maxChallengeDays,
  );
}

function isDefaultChallengePlaceholder(settings: CommitmentSettings): boolean {
  return (
    settings.challenge.startDate === todayKey() &&
    settings.challenge.endDate === todayKey() &&
    Object.keys(settings.dailyAttempts).length === 0
  );
}

function parseDuration(value: string): number | null {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < minChallengeDays || duration > maxChallengeDays) {
    return null;
  }
  return duration;
}

function addDays(dateKey: string, offset: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return todayKey(date);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
