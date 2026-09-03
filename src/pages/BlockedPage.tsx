import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityGrid } from '../components/ActivityGrid';
import { buildActivityDays } from '../lib/activity';
import { isValidChallenge, todayKey } from '../lib/dates';
import { getSettings, getUsage, type CommitmentSettings, type UsageState } from '../lib/storage';
import { usedSecondsOn } from '../lib/tracking';

const DISTRACTION_COPY = [
  'This costs attention.',
  'You came here instead of the work.',
  'The clock did not stop for this.',
  'Focus is limited. Spend it carefully.',
  'Five attempts. You are starting to pay for a habit.',
  'This page gets attention because you give it attention.',
  'Every repeat makes returning to work harder.',
  'Eight attempts. The cost is showing.',
  'You are trading focus for a moment of avoidance.',
  'Ten attempts. This is no longer accidental.',
  'The work has less of you now.',
  'You are spending attention on something you already rejected.',
  'Thirteen attempts. The trade keeps getting worse.',
  'Fourteen attempts. Stop giving the day away in pieces.',
  'Halfway to thirty. This is the pattern.',
  'The minute is gone. So is the focus that came with it.',
  'Seventeen attempts. You keep choosing the worse side of the trade.',
  'The urge is brief. The cost lasts longer.',
  'Nineteen attempts. Your attention is being drained by repetition.',
  'Twenty attempts. Close it and protect what is left.',
  'This is taking more from the day than it returns.',
  'Your best focus belongs to the task, not this loop.',
  'Twenty-three attempts. Tomorrow is starting to pay for today.',
  'Novelty is cheap. Deep focus is expensive.',
  'Twenty-five attempts. The cost is clear.',
  'You already know this trade is bad.',
  'Twenty-seven attempts. The clock is still moving.',
  'You cannot get this attention back later.',
  'One more makes thirty. Nothing is gained.',
  'Thirty attempts. Take your attention back now.'
];

export function BlockedPage() {
  const [settings, setSettings] = useState<CommitmentSettings | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    void getUsage().then(setUsage);
  }, []);

  const activityDays = useMemo(() => {
    if (!settings || !isValidChallenge(settings.challenge)) {
      return [];
    }

    return buildActivityDays(
      settings.challenge.startDate,
      settings.challenge.endDate,
      settings.dailyAttempts
    );
  }, [settings]);

  if (!settings) {
    return (
      <BlockedShell>
        <main className="grid min-h-screen place-items-center px-6">
          <p className="text-[13px] font-medium leading-5 text-[var(--color-text-tertiary)]">Loading</p>
        </main>
      </BlockedShell>
    );
  }

  const validChallenge = isValidChallenge(settings.challenge);
  const distractedToday = settings.dailyAttempts[todayKey()] ?? 0;
  const allowanceCopy = getAllowanceCopy(settings, usage);
  const distractionCopy = allowanceCopy ?? getDistractionCopy(distractedToday);

  return (
    <BlockedShell>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10">
        <div className="flex w-full flex-col items-center gap-12 sm:gap-14">
          <div className="flex items-center gap-2.5 text-[var(--color-text-tertiary)]">
            <img
              src="/icons/icon-32.png"
              alt=""
              className="size-6 rounded-[6px] opacity-80"
              aria-hidden="true"
            />
            <span className="type-overline">Focuh</span>
          </div>

          <section className="flex max-w-xl flex-col items-center gap-3" aria-label="Blocked attempts today">
            <div className="text-[clamp(3.75rem,8vw,6.5rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[var(--color-text-primary)]">
              {distractedToday}
            </div>
            <div className="type-label text-[var(--color-text-secondary)]">
              times distracted
            </div>
            {distractionCopy && (
              <p key={distractionCopy} className="blocked-copy type-context mt-3 max-w-xl text-balance text-[var(--color-text-tertiary)]">
                {distractionCopy}
              </p>
            )}
          </section>

          {validChallenge && activityDays.length > 0 && (
            <div className="w-full max-w-2xl border-t border-[var(--color-border)] pt-10 sm:pt-12">
              <ActivityGrid days={activityDays} />
            </div>
          )}
        </div>
      </main>
    </BlockedShell>
  );
}

function BlockedShell({ children }: { children: ReactNode }) {
  return (
    <div className="blocked-screen min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      {children}
      <footer className="fixed inset-x-0 bottom-5 flex justify-center px-6">
        <a
          href="https://focuh.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-md px-2 py-1 text-[12px] font-medium leading-4 text-[var(--color-text-tertiary)] transition hover:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-strong)]"
        >
          focuh.com
        </a>
      </footer>
    </div>
  );
}

function getDistractionCopy(count: number): string | null {
  if (count <= 0) {
    return null;
  }

  return DISTRACTION_COPY[Math.min(count, DISTRACTION_COPY.length) - 1];
}

function getAllowanceCopy(settings: CommitmentSettings, usage: UsageState | null): string | null {
  const blockedByAllowance =
    new URLSearchParams(window.location.search).get('reason') === 'allowance';

  if (!blockedByAllowance || settings.dailyAllowanceMinutes <= 0) {
    return null;
  }

  const remainingSeconds = usage
    ? Math.max(0, settings.dailyAllowanceMinutes * 60 - usedSecondsOn(usage, todayKey()))
    : 0;

  if (remainingSeconds > 0) {
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return `You have ${remainingMinutes} of your ${settings.dailyAllowanceMinutes} minutes left today.`;
  }

  return `You've used your ${settings.dailyAllowanceMinutes} minutes for today.`;
}
