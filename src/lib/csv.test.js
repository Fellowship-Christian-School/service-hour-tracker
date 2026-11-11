import { describe, expect, test } from "bun:test";
import { csvRow, escapeCsvCell } from "./csv";

describe("CSV export escaping", () => {
  test("quotes text and doubles embedded quotes without losing delimiters or newlines", () => {
    expect(escapeCsvCell('Serve, "help"\r\nnext\nline')).toBe('"Serve, ""help""\r\nnext\nline"');
    expect(escapeCsvCell("José 日本語")).toBe('"José 日本語"');
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
    expect(escapeCsvCell("")).toBe('""');
  });

  test("neutralizes formula prefixes, including whitespace and control prefixes", () => {
    for (const prefix of ["=", "+", "-", "@"]) {
      for (const whitespace of ["", " ", "\t", "\r", "\n", " \t\r\n", "\u0000", "\u00a0"]) {
        const value = `${whitespace}${prefix}SUM(1,2)`;
        expect(escapeCsvCell(value)).toBe(`"'${value}"`);
      }
    }
    for (const value of ["\ttext", "\rtext", "\ntext"]) {
      expect(escapeCsvCell(value)).toBe(`"'${value}"`);
    }
    expect(escapeCsvCell('=HYPERLINK("target","label")')).toBe('"\'=HYPERLINK(""target"",""label"")"');
  });

  test("preserves safe text and keeps genuine numbers numeric", () => {
    expect(escapeCsvCell("a+b@example.com")).toBe('"a+b@example.com"');
    expect(escapeCsvCell("already 'quoted")).toBe('"already \'quoted"');
    expect(escapeCsvCell(0)).toBe("0");
    expect(escapeCsvCell(1.5)).toBe("1.5");
    expect(escapeCsvCell(-2)).toBe("-2");
    expect(escapeCsvCell("-2")).toBe('"\'-2"');
  });

  test("serializes every student-export column consistently", () => {
    expect(csvRow(['Help, "all"', "2026-11-11", 2.5, "APPROVED", "=1+1", null]))
      .toBe('"Help, ""all""","2026-11-11",2.5,"APPROVED","\'=1+1",""');
  });

  test("protects roster names, email, roles and joined flag names", () => {
    expect(csvRow(["+Name", "@example.com", "ADMIN", '=Flag; Other, "flag"', 0]))
      .toBe('"\'+Name","\'@example.com","ADMIN","\'=Flag; Other, ""flag""",0');
  });
});
