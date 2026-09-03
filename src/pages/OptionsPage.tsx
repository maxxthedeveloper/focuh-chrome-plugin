import { Button } from '@base-ui/react/button';
import { Field } from '@base-ui/react/field';
import { Input } from '@base-ui/react/input';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { AlertTriangle, Check, Plus, Trash01 as Trash2 } from "@untitledui/icons";
import { type FormEvent, useEffect, useState } from 'react';
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
import {
  CommitmentSettings,
  getSettings,
  removeBlockedDomainFromSettings,
  resetUsage,
  restartChallenge,
  saveSettings,
} from '../lib/storage';
import { RulesSettings, type RulesSettingsProps } from '../components/RulesSettings';

const minChallengeDays = 1;
const maxChallengeDays = 365;
const defaultChallengeDays = 90;
const presetDays = [30, 90, 180];

export function OptionsPage() {
  const [settings, setSettings] = useState<CommitmentSettings | null>(null);
  const [daysInput, setDaysInput] = useState(String(defaultChallengeDays));
  const [durationError, setDurationError] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState('');
  const [created, setCreated] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [pendingRemovalDomain, setPendingRemovalDomain] = useState<string | null>(null);

  useEffect(() => {
    void getSettings().then((storedSettings) => {
      setSettings(storedSettings);
      setDaysInput(String(getInitialDuration(storedSettings)));
    });
  }, []);

  const duration = parseDuration(daysInput);
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
  const restartPreview = duration ? getChallengePreview(duration) : null;

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
    await resetUsage();
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

  function requestRemoveDomain(domain: string) {
    setDomainError('');

    if (activeChallenge) {
      setPendingRemovalDomain(domain);
      return;
    }

    void removeDomain(domain, false);
  }

  async function removeDomain(domain: string, restartChallenge: boolean) {
    const nextSettings = removeBlockedDomainFromSettings(currentSettings, domain, {
      restartChallenge,
      today: todayKey(),
    });

    await saveSettings(nextSettings);
    if (restartChallenge) {
      await resetUsage();
    }
    setSettings(nextSettings);
    setDaysInput(String(getInitialDuration(nextSettings)));
    setDomainError('');
    setDurationError('');
    setPendingRemovalDomain(null);
    setResetArmed(false);
  }

  const sharedDomainProps = {
    domains: currentSettings.blockedDomains,
    domainInput,
    domainError,
    removalRequiresRestart: activeChallenge,
    pendingRemovalDomain,
    onDomainInputChange: (value: string) => {
      setDomainInput(value);
      setDomainError('');
    },
    onAddDomain: addDomain,
    onRequestRemoveDomain: requestRemoveDomain,
    onCancelRemoveDomain: () => setPendingRemovalDomain(null),
    onConfirmRemoveDomain: (domain: string) => void removeDomain(domain, true),
  };

  const sharedRulesProps: RulesSettingsProps = {
    settings: currentSettings,
    activeChallenge,
    onSave: async (nextSettings) => {
      await saveSettings(nextSettings);
      setSettings(nextSettings);
    },
    onSaveWithRestart: async (nextSettings) => {
      const restarted = restartChallenge(nextSettings, todayKey());
      await saveSettings(restarted);
      await resetUsage();
      setSettings(restarted);
      setDaysInput(String(getInitialDuration(restarted)));
      setResetArmed(false);
    },
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--color-canvas)] px-6 text-[var(--color-text-primary)] sm:px-10">
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center py-12 sm:py-16">
        {activeChallenge ? (
          <ActiveView
            remainingDays={remainingDays}
            totalDays={totalDays}
            currentRange={currentRange}
            restartPreview={restartPreview}
            daysInput={daysInput}
            durationError={durationError}
            resetArmed={resetArmed}
            created={created}
            onStartOver={() => setResetArmed(true)}
            onCancelStartOver={() => {
              setResetArmed(false);
              setDurationError('');
            }}
            onDaysChange={updateDays}
            onSubmit={createChallenge}
            domainProps={sharedDomainProps}
            rulesProps={sharedRulesProps}
          />
        ) : (
          <CreateView
            daysInput={daysInput}
            durationError={durationError}
            created={created}
            onDaysChange={updateDays}
            onSubmit={createChallenge}
            domainProps={sharedDomainProps}
            rulesProps={sharedRulesProps}
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
  onDaysChange,
  onSubmit,
  domainProps,
  rulesProps,
}: {
  daysInput: string;
  durationError: string;
  created: boolean;
  onDaysChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  domainProps: DomainSettingsProps;
  rulesProps: RulesSettingsProps;
}) {
  return (
    <>
      <header className="text-center">
        <img
          src="/icons/icon-128.png"
          alt=""
          className="mx-auto size-14 rounded-[16px] shadow-[var(--shadow-soft)] ring-1 ring-black/10"
          aria-hidden="true"
        />
      </header>

      <form className="mt-9 w-full" onSubmit={onSubmit}>
        <DurationInput
          daysInput={daysInput}
          durationError={durationError}
          onDaysChange={onDaysChange}
          size="lg"
        />

        <DayPresets daysInput={daysInput} onDaysChange={onDaysChange} />

        <PrimaryButton created={created} label="Create challenge" createdLabel="Challenge created" />
      </form>

      <DomainSettings {...domainProps} />

      <RulesSettings {...rulesProps} />
    </>
  );
}

// ─── State 2: Active challenge ────────────────────────────────────────────────

function ActiveView({
  remainingDays,
  totalDays,
  currentRange,
  restartPreview,
  daysInput,
  durationError,
  resetArmed,
  created,
  onStartOver,
  onCancelStartOver,
  onDaysChange,
  onSubmit,
  domainProps,
  rulesProps,
}: {
  remainingDays: number;
  totalDays: number;
  currentRange: string;
  restartPreview: ChallengePreview | null;
  daysInput: string;
  durationError: string;
  resetArmed: boolean;
  created: boolean;
  onStartOver: () => void;
  onCancelStartOver: () => void;
  onDaysChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  domainProps: DomainSettingsProps;
  rulesProps: RulesSettingsProps;
}) {
  const heroDays = resetArmed ? restartPreview?.days : remainingDays;
  const heroRange = resetArmed ? restartPreview?.range : currentRange;
  const heroTotalDays = resetArmed ? restartPreview?.days : totalDays;
  const heroLabel = resetArmed ? 'New challenge' : 'Focuh';

  return (
    <>
      {/* Hero: days remaining */}
      <header className="text-center">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] font-medium leading-5 text-[var(--color-text-secondary)] shadow-[var(--shadow-soft)]">
          <img
            src="/icons/icon-32.png"
            alt=""
            className="size-4 rounded-[4px]"
            aria-hidden="true"
          />
          {heroLabel}
        </p>
        <div className="mt-10 flex items-baseline justify-center">
          <span className="tabular-nums text-[88px] font-semibold leading-none sm:text-[104px]">
            {heroDays ?? '--'}
          </span>
          <span className="ml-3 text-[22px] font-medium leading-none text-[var(--color-text-tertiary)]">
            {resetArmed ? 'days' : remainingDays === 1 ? 'day left' : 'days left'}
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-5 text-[var(--color-text-tertiary)]">
          {heroRange ?? `Choose ${minChallengeDays}-${maxChallengeDays} days`}
          {heroTotalDays ? <span className="ml-2 opacity-50">· {heroTotalDays} days</span> : null}
        </p>
      </header>

      <DomainSettings {...domainProps} />

      <RulesSettings {...rulesProps} />

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
              size="md"
            />

            <Button
              type="submit"
              className={cn(
                'mx-auto mt-6 flex min-h-[48px] w-full max-w-[320px] items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-semibold',
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
              <span>{created ? 'Challenge restarted' : 'Confirm restart'}</span>
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
    <div className="mt-6 flex w-full justify-center">
      <ToggleGroup
        value={activePreset ? [activePreset] : []}
        onValueChange={(vals) => {
          if (vals.length > 0) onDaysChange(vals[0]);
        }}
        className="grid w-full max-w-[276px] grid-cols-3 rounded-full bg-[var(--color-surface)] p-1 shadow-[inset_0_0_0_1px_var(--color-border),var(--shadow-soft)]"
      >
        {presetDays.map((d) => (
          <Toggle
            key={d}
            value={String(d)}
            className={cn(
              'h-10 min-w-0 rounded-full px-0 text-[14px] font-semibold tabular-nums',
              'cursor-pointer select-none transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
              'text-[var(--color-text-secondary)]',
              'hover:text-[var(--color-text-primary)] active:scale-[0.96]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]',
              'data-[pressed]:bg-[var(--color-text-primary)] data-[pressed]:text-[var(--color-canvas)] data-[pressed]:shadow-[0_1px_2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]',
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
  size,
}: {
  daysInput: string;
  durationError: string;
  onDaysChange: (v: string) => void;
  size: 'lg' | 'md';
}) {
  return (
    <Field.Root invalid={Boolean(durationError)}>
      <Field.Label className="sr-only">Days</Field.Label>
      <div className="flex items-baseline justify-center">
        <Input
          type="number"
          inputMode="numeric"
          min={minChallengeDays}
          max={maxChallengeDays}
          value={daysInput}
          onChange={(e) => onDaysChange(e.target.value)}
          className={cn(
            'w-[3.25ch] appearance-none bg-transparent text-center font-semibold leading-none',
            'text-[var(--color-text-primary)] outline-none selection:bg-[var(--color-accent-soft)] tabular-nums',
            size === 'lg' ? 'text-[96px] tracking-[-0.04em] sm:text-[112px]' : 'text-[72px] tracking-[-0.025em]',
          )}
          aria-describedby={durationError ? 'duration-error' : undefined}
        />
        <span
          className={cn(
            'ml-3 font-medium leading-none text-[var(--color-text-secondary)]',
            size === 'lg' ? 'text-[20px]' : 'text-[20px]',
          )}
        >
          days
        </span>
      </div>
      {durationError ? (
        <Field.Error id="duration-error" className="mt-4 block text-center text-[13px] leading-5 text-[var(--color-danger)]">
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
        'mx-auto mt-8 flex min-h-[52px] w-full max-w-[360px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold',
        'bg-[var(--color-accent)] text-white shadow-[var(--shadow-button)]',
        'transition-[filter,transform,box-shadow] duration-150 ease-out',
        'hover:brightness-[0.94] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] active:scale-[0.98]',
      )}
    >
      {created ? (
        <Check
          size={18}
          strokeWidth={2.5}
          className="confirm-check shrink-0"
          aria-hidden="true"
        />
      ) : null}
      <span>{created ? createdLabel : label}</span>
    </Button>
  );
}

type DomainSettingsProps = {
  domains: string[];
  domainInput: string;
  domainError: string;
  removalRequiresRestart: boolean;
  pendingRemovalDomain: string | null;
  onDomainInputChange: (value: string) => void;
  onAddDomain: (event: FormEvent<HTMLFormElement>) => void;
  onRequestRemoveDomain: (domain: string) => void;
  onCancelRemoveDomain: () => void;
  onConfirmRemoveDomain: (domain: string) => void;
};

type ChallengePreview = {
  days: number;
  range: string;
};

function DomainSettings({
  domains,
  domainInput,
  domainError,
  removalRequiresRestart,
  pendingRemovalDomain,
  onDomainInputChange,
  onAddDomain,
  onRequestRemoveDomain,
  onCancelRemoveDomain,
  onConfirmRemoveDomain,
}: DomainSettingsProps) {
  return (
    <section className="mt-12">
      <form onSubmit={onAddDomain}>
        <Field.Root invalid={Boolean(domainError)}>
          <Field.Label className="sr-only">Website</Field.Label>
          <div className="flex h-12 items-center rounded-full bg-[var(--color-field)] px-1.5 shadow-[inset_0_0_0_1px_var(--color-border),var(--shadow-soft)] focus-within:shadow-[inset_0_0_0_1px_var(--color-border-strong),0_0_0_4px_var(--color-accent-soft)]">
            <Input
              value={domainInput}
              onChange={(e) => onDomainInputChange(e.target.value)}
              placeholder="youtube.com"
              className="h-full w-0 min-w-0 flex-1 bg-transparent px-4 text-[15px] leading-5 text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
            <Button
              type="submit"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-[background-color,color,transform] duration-150 ease-out hover:bg-[var(--color-text-primary)] hover:text-[var(--color-canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)] active:scale-[0.96]"
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
        {domains.map((domain) => {
          const confirmingRemoval = removalRequiresRestart && pendingRemovalDomain === domain;

          return (
            <div key={domain} className="py-2">
              <div className="flex min-h-10 items-center justify-between gap-4">
                <span className="min-w-0 truncate text-[15px] font-medium leading-6">{domain}</span>
                <Button
                  type="button"
                  onClick={() => onRequestRemoveDomain(domain)}
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-[background-color,color,transform] duration-150 ease-out focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-soft)] active:scale-[0.94]',
                    confirmingRemoval
                      ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                      : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]',
                  )}
                  aria-expanded={confirmingRemoval}
                  aria-label={`Remove ${domain}`}
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              {confirmingRemoval ? (
                <div
                  role="alert"
                  className="mt-2 rounded-lg bg-[var(--color-danger-soft)] px-3 py-3"
                >
                  <div className="flex gap-2">
                    <AlertTriangle
                      size={16}
                      className="mt-0.5 shrink-0 text-[var(--color-danger)]"
                      aria-hidden="true"
                    />
                    <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
                      Removing this site will restart your current challenge and clear your progress.
                    </p>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onCancelRemoveDomain}
                      className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-tertiary)] transition hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)]"
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      onClick={() => onConfirmRemoveDomain(domain)}
                      className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-[13px] font-semibold text-white transition-[filter,transform] duration-150 ease-out hover:brightness-90 focus:outline-none focus:ring-4 focus:ring-[var(--color-danger-soft)] active:scale-[0.96]"
                    >
                      Remove & restart
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
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

function getChallengePreview(days: number): ChallengePreview {
  const startDate = todayKey();
  const endDate = addDays(startDate, days - 1);

  return {
    days,
    range: `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`,
  };
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
