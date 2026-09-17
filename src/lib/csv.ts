// Values starting with these characters can run as formulas when a CSV is
// opened in Excel or Sheets, so habit names get defused before export.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  let s = String(value ?? '');
  if (typeof value === 'string' && FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends object>(rows: T[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]) as (keyof T)[];
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(headers.map((h) => cell(row[h])).join(','));
  return lines.join('\n');
}

export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
