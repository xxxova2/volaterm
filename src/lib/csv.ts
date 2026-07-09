/**
 * Lightweight CSV export for terminal boards (Phase E/G).
 */

export function rowsToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  const esc = (v: string | number | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) {
    lines.push(row.map(esc).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTableCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  downloadCsv(filename, rowsToCsv(headers, rows));
}
