import { cn } from '../lib/cn';
import { formatDisplayDate } from '../lib/dates';
import type { ActivityDay, ActivityTone } from '../lib/activity';

interface ActivityGridProps {
  days: ActivityDay[];
  compact?: boolean;
}

const toneClass: Record<ActivityTone, string> = {
  future: 'bg-[var(--tile-future)]',
  today: 'bg-[var(--tile-today)] ring-1 ring-[var(--tile-today-ring)]',
  clean: 'bg-[var(--tile-clean)]',
  'level-1': 'bg-[var(--tile-1)]',
  'level-2': 'bg-[var(--tile-2)]',
  'level-3': 'bg-[var(--tile-3)]',
  'level-4': 'bg-[var(--tile-4)]',
};

export function ActivityGrid({ days, compact = false }: ActivityGridProps) {
  const leadingBlanks = days.length ? weekdayIndex(days[0].date) : 0;
  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({
      kind: 'blank' as const,
      id: `blank-${index}`
    })),
    ...days.map((day) => ({ kind: 'day' as const, id: day.date, day }))
  ];

  return (
    <div className="flex justify-center overflow-x-auto pb-1" aria-label="Challenge activity">
      <div
        className={cn(
          'grid w-max grid-flow-col grid-rows-7 gap-[3px]',
          compact ? '[--tile-size:10px]' : '[--tile-size:18px] sm:[--tile-size:22px]'
        )}
      >
        {cells.map((cell) =>
          cell.kind === 'blank' ? (
            <span key={cell.id} className="size-[var(--tile-size)]" aria-hidden="true" />
          ) : (
            <span
              key={cell.id}
              title={`${formatDisplayDate(cell.day.date)}: ${cell.day.count} blocked ${
                cell.day.count === 1 ? 'attempt' : 'attempts'
              }`}
              className={cn(
                'size-[var(--tile-size)] rounded-[5px] transition-[filter] duration-150 hover:brightness-125',
                toneClass[cell.day.tone]
              )}
              aria-label={`${formatDisplayDate(cell.day.date)}, ${cell.day.count} blocked attempts`}
            />
          )
        )}
      </div>
    </div>
  );
}

function weekdayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}
