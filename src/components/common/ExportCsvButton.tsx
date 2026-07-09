import { exportTableCsv } from '../../lib/csv';
import { cn } from '../../lib/utils';

export function ExportCsvButton({
  filename,
  headers,
  rows,
  className,
  label = 'CSV',
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        exportTableCsv(filename, headers, rows);
      }}
      disabled={!rows.length}
      className={cn(
        'rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground',
        'hover:border-primary hover:text-primary disabled:opacity-40',
        className,
      )}
      title="Export table as CSV"
    >
      {label}
    </button>
  );
}
