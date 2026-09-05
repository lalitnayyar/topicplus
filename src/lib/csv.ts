// CSV export with spreadsheet formula-injection protection (Section 5).
// Any cell starting with =, +, -, @, tab, or CR is prefixed with a single quote so
// spreadsheet apps render it as text instead of evaluating it as a formula.
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);
  if (DANGEROUS_PREFIX.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return lines.join("\r\n");
}
