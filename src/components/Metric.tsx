import type { ReactNode } from 'react';

interface MetricProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

export function Metric({ label, value, detail }: MetricProps) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <p className="text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--color-text-tertiary)]">
        {label}
      </p>
      <div className="mt-3 text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">{value}</div>
      {detail ? <p className="mt-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">{detail}</p> : null}
    </div>
  );
}
