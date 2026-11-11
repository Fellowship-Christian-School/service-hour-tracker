export type CsvCell = string | number | null | undefined;

/** Escape CSV text and prevent spreadsheet formulas, including whitespace-prefixed ones. */
export function escapeCsvCell(value: CsvCell): string {
  if (typeof value === "number") return String(value);

  let text = value ?? "";
  // Spreadsheet importers may ignore leading whitespace/control characters.
  if (/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(text) || /^[\t\r\n]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(cells: readonly CsvCell[]): string {
  return cells.map(escapeCsvCell).join(",");
}
