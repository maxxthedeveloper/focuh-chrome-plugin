import { Switch } from '@base-ui/react/switch';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { AlertTriangle } from "@untitledui/icons";
import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import {
  DEFAULT_WORK_SCHEDULE,
  WorkSchedule,
  minuteToTimeValue,
  timeValueToMinute,
} from '../lib/schedule';
import { CommitmentSettings, isLoosening } from '../lib/storage';

const minAllowanceMinutes = 1;
const maxAllowanceMinutes = 120;
const defaultAllowanceMinutes = 15;

const weekDays: { value: string; label: string; name: string }[] = [
  { value: '1', label: 'M', name: 'Monday' },
  { value: '2', label: 'T', name: 'Tuesday' },
  { value: '3', label: 'W', name: 'Wednesday' },
  { value: '4', label: 'T', name: 'Thursday' },
  { value: '5', label: 'F', name: 'Friday' },
  { value: '6', label: 'S', name: 'Saturday' },
  { value: '0', label: 'S', name: 'Sunday' },
];

type Rules = {
  workSchedule: WorkSchedule | null;
  dailyAllowanceMinutes: number;
};

export type RulesSettingsProps = {
  settings: CommitmentSettings;
  activeChallenge: boolean;
  onSave: (next: CommitmentSettings) => Promise<void>;
  onSaveWithRestart: (next: CommitmentSettings) => Promise<void>;
};

export function RulesSettings({
  settings,
  activeChallenge,
  onSave,
  onSaveWithRestart,
}: RulesSettingsProps) {
  const savedRules = rulesOf(settings);
  const savedKey = JSON.stringify(savedRules);

  const [draft, setDraft] = useState<Rules>(savedRules);
  const [allowanceInput, setAllowanceInput] = useState(String(savedRules.dailyAllowanceMinutes));

  useEffect(() => {
    const rules = rulesOf(settings);
    setDraft(rules);
    setAllowanceInput(String(rules.dailyAllowanceMinutes || defaultAllowanceMinutes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const scheduleError = getScheduleError(draft.workSchedule);
  const valid = !scheduleError;
  const dirty = JSON.stringify(draft) !== savedKey;
  const loosening = isLoosening(settings, { ...settings, ...draft });
  const awaitingRestart = activeChallenge && dirty && valid && loosening;

  function applyDraft(nextDraft: Rules) {
    setDraft(nextDraft);

    if (getScheduleError(nextDraft.workSchedule)) {
      return;
    }

    const nextSettings = { ...settings, ...nextDraft };

    if (JSON.stringify(rulesOf(nextSettings)) === savedKey) {
      return;
    }

    if (!activeChallenge || !isLoosening(settings, nextSettings)) {
      void onSave(nextSettings);
    }
  }

  function toggleSchedule(enabled: boolean) {
    applyDraft({
      ...draft,
      workSchedule: enabled ? DEFAULT_WORK_SCHEDULE : null,
    });
  }

  function updateScheduleDays(values: readonly string[]) {
    if (!draft.workSchedule) return;
    applyDraft({
      ...draft,
      workSchedule: { ...draft.workSchedule, days: values.map(Number).sort() },
    });
  }

  function updateScheduleTime(edge: 'startMinute' | 'endMinute', value: string) {
    if (!draft.workSchedule) return;
    const minute = timeValueToMinute(value);
    if (minute === null) return;
    applyDraft({
      ...draft,
      workSchedule: { ...draft.workSchedule, [edge]: minute },
    });
  }

  function toggleAllowance(enabled: boolean) {
    const minutes = enabled ? parseAllowance(allowanceInput) ?? defaultAllowanceMinutes : 0;
    setAllowanceInput(String(enabled ? minutes : defaultAllowanceMinutes));
    applyDraft({ ...draft, dailyAllowanceMinutes: minutes });
  }

  function commitAllowance() {
    if (draft.dailyAllowanceMinutes === 0) return;
    const minutes = parseAllowance(allowanceInput) ?? draft.dailyAllowanceMinutes;
    setAllowanceInput(String(minutes));
    applyDraft({ ...draft, dailyAllowanceMinutes: minutes });
  }

  function cancelDraft() {
    setDraft(savedRules);
    setAllowanceInput(String(savedRules.dailyAllowanceMinutes || defaultAllowanceMinutes));
  }

  const scheduleOn = draft.workSchedule !== null;
  const allowanceOn = draft.dailyAllowanceMinutes > 0;

  return (
    <section className="mt-10 border-t border-[var(--color-border)] pt-8">
      {/* Work hours */}
      <RuleRow
        title="Work hours"
        description="Only block during these times. Outside them, browsing is free."
        checked={scheduleOn}
        onCheckedChange={toggleSchedule}
      >
        {scheduleOn && draft.workSchedule ? (
          <div className="mt-4 space-y-4">
            <ToggleGroup
              multiple
              value={draft.workSchedule.days.map(String)}
              onValueChange={(values) => updateScheduleDays(values)}
              className="flex justify-between gap-1.5"
              aria-label="Work days"
            >
              {weekDays.map((day) => (
                <Toggle
                  key={day.value}
                  value={day.value}
                  aria-label={day.name}
                  className={cn(
                    'size-9 rounded-full text-[13px] font-semibold',
                    'cursor-pointer select-none transition-[background-color,color,box-shadow,transform] duration-150 ease-out',
                    'bg-[var(--color-surface)] text-[var(--color-text-tertiary)] shadow-[inset_0_0_0_1px_var(--color-border)]',
                    'hover:text-[var(--color-text-primary)] active:scale-[0.94]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]',
                    'data-[pressed]:bg-[var(--color-text-primary)] data-[pressed]:text-[var(--color-canvas)] data-[pressed]:shadow-none',
                  )}
                >
                  {day.label}
                </Toggle>
              ))}
            </ToggleGroup>

            <div className="flex items-center gap-3">
              <TimeInput
                label="Start time"
                value={minuteToTimeValue(draft.workSchedule.startMinute)}
                onChange={(value) => updateScheduleTime('startMinute', value)}
              />
              <span className="text-[13px] text-[var(--color-text-tertiary)]">to</span>
              <TimeInput
                label="End time"
                value={minuteToTimeValue(draft.workSchedule.endMinute)}
                onChange={(value) => updateScheduleTime('endMinute', value)}
              />
            </div>

            {scheduleError ? (
              <p className="text-[13px] leading-5 text-[var(--color-danger)]">{scheduleError}</p>
            ) : null}
          </div>
        ) : null}
      </RuleRow>

      {/* Daily allowance */}
      <RuleRow
        title="Daily limit"
        description="Minutes allowed on blocked sites each day before they lock."
        checked={allowanceOn}
        onCheckedChange={toggleAllowance}
        className="mt-6"
      >
        {allowanceOn ? (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              min={minAllowanceMinutes}
              max={maxAllowanceMinutes}
              value={allowanceInput}
              onChange={(e) => setAllowanceInput(e.target.value)}
              onBlur={commitAllowance}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitAllowance();
                }
              }}
              aria-label="Daily limit in minutes"
              className={cn(
                'h-10 w-[72px] rounded-lg bg-[var(--color-field)] px-3 text-center text-[15px] font-semibold tabular-nums',
                'text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_var(--color-border)] outline-none',
                'focus:shadow-[inset_0_0_0_1px_var(--color-border-strong),0_0_0_4px_var(--color-accent-soft)]',
              )}
            />
            <span className="text-[14px] text-[var(--color-text-secondary)]">minutes per day</span>
          </div>
        ) : null}
      </RuleRow>

      {/* Loosening the rules mid-challenge requires a restart */}
      {awaitingRestart ? (
        <div role="alert" className="mt-5 rounded-lg bg-[var(--color-danger-soft)] px-3 py-3">
          <div className="flex gap-2">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              aria-hidden="true"
            />
            <p className="text-[13px] leading-5 text-[var(--color-text-secondary)]">
              Loosening the rules will restart your current challenge and clear your progress.
            </p>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelDraft}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[var(--color-text-tertiary)] transition hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onSaveWithRestart({ ...settings, ...draft })}
              className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-[13px] font-semibold text-white transition-[filter,transform] duration-150 ease-out hover:brightness-90 focus:outline-none focus:ring-4 focus:ring-[var(--color-danger-soft)] active:scale-[0.96]"
            >
              Change & restart
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RuleRow({
  title,
  description,
  checked,
  onCheckedChange,
  className,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-6">{title}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-[var(--color-text-tertiary)]">
            {description}
          </p>
        </div>
        <Switch.Root
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label={title}
          className={cn(
            'relative h-6 w-10 shrink-0 cursor-pointer rounded-full bg-[var(--color-border-strong)] p-0.5',
            'transition-colors duration-150 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]',
            'data-[checked]:bg-[var(--color-accent)]',
          )}
        >
          <Switch.Thumb
            className={cn(
              'block size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)]',
              'transition-transform duration-150 ease-out',
              'data-[checked]:translate-x-4',
            )}
          />
        </Switch.Root>
      </div>
      {children}
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn(
        'h-10 rounded-lg bg-[var(--color-field)] px-3 text-[15px] font-medium tabular-nums',
        'text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_var(--color-border)] outline-none',
        'focus:shadow-[inset_0_0_0_1px_var(--color-border-strong),0_0_0_4px_var(--color-accent-soft)]',
      )}
    />
  );
}

function rulesOf(settings: CommitmentSettings): Rules {
  return {
    workSchedule: settings.workSchedule,
    dailyAllowanceMinutes: settings.dailyAllowanceMinutes,
  };
}

function getScheduleError(schedule: WorkSchedule | null): string | null {
  if (schedule === null) {
    return null;
  }

  if (schedule.days.length === 0) {
    return 'Pick at least one day.';
  }

  if (schedule.endMinute <= schedule.startMinute) {
    return 'End time must be after start time.';
  }

  return null;
}

function parseAllowance(value: string): number | null {
  const minutes = Number(value);

  if (!Number.isInteger(minutes)) {
    return null;
  }

  return Math.min(maxAllowanceMinutes, Math.max(minAllowanceMinutes, minutes));
}
