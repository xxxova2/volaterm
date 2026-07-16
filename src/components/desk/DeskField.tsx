import type { ChangeEvent } from 'react';
import { cn } from '../../lib/utils';

const fieldClass =
  'w-full min-w-[4rem] rounded border border-amber-500/40 bg-background px-1.5 py-0.5 font-mono text-xs text-foreground shadow-[inset_0_0_0_1px_rgba(232,168,56,0.12)] focus:border-amber-400 focus:outline-none';

const labelClass = 'flex flex-col gap-0.5 font-mono text-type-2xs uppercase tracking-wider text-amber-500/90';

export function DeskField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  className,
  inputClassName,
}: {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <label className={cn(labelClass, className)}>
      {label}
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(+e.target.value)}
        className={cn(fieldClass, inputClassName)}
      />
    </label>
  );
}

export function DeskSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn(labelClass, className)}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={fieldClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
