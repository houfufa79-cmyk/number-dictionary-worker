// Extracts the 2-digit and 3-digit meaning paragraphs VERBATIM from the source MHTML.
// Source: 卡巴拉51词典20260830 51dictionary+recopy+CCBY+version.mhtml (CC-BY), on the Desktop.
// Writes src/raw-dictionary.js — a literal copy of the source paragraphs, no rewriting.
//
// Run: node scripts/extract.mjs [path-to-mhtml]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultMhtml =
  'C:/Users/power/Desktop/卡巴拉51词典20260830 51dictionary+recopy+CCBY+version.mhtml';
const mhtmlPath = process.argv[2] || defaultMhtml;

// ---- 1. Decode the quoted-printable HTML part out of the MHTML ----
function decodeQuotedPrintable(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x3d) {
      // '='
      const next = bytes[i + 1];
      if (next === 0x0d && bytes[i + 2] === 0x0a) { i += 2; continue; } // soft break CRLF
      if (next === 0x0a) { i += 1; continue; } // soft break LF
      if (next === 0x0d) { i += 2; continue; }
      const h = String.fromCharCode(bytes[i + 1]);
      const l = String.fromCharCode(bytes[i + 2]);
      if (/^[0-9A-Fa-f]$/.test(h) && /^[0-9A-Fa-f]$/.test(l)) {
        out += String.fromCharCode(parseInt(h + l, 16));
        i += 2;
        continue;
      }
    }
    out += String.fromCharCode(b);
  }
  return out;
}

const raw = readFileSync(mhtmlPath);
const boundary = '------=_NextPart_000_0076_01C29953.BE473C30';
const text = raw.toString('latin1');
const firstPart = text.split(boundary)[1];
const headerEnd = firstPart.indexOf('\n\n');
const bodyLatin1 = firstPart.slice(headerEnd + 2);
const htmlLatin1 = decodeQuotedPrintable(Buffer.from(bodyLatin1, 'latin1'));
// Re-encode latin1 string back to bytes, then decode as UTF-8 (source charset=utf-8).
const html = Buffer.from(htmlLatin1, 'latin1').toString('utf8');

// ---- 2. Strip to plain paragraph text ----
function htmlToParagraphs(s) {
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  const parts = s.split(/<\/p>/i);
  return parts
    .map((p) => p.replace(/<[^>]+>/g, ' '))
    .map((p) => p.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'))
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
const paras = htmlToParagraphs(html);

// ---- 3. Parse the three tables verbatim (cell text, no editing) ----
function parseTables(s) {
  const tables = [];
  for (const t of s.match(/<table[\s\S]*?<\/table>/gi) || []) {
    const rows = [];
    for (const r of t.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
      const cells = [];
      for (const c of r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []) {
        let v = c.replace(/^<t[dh][^>]*>/i, '').replace(/<\/t[dh]>$/i, '');
        v = v.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
             .replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
        cells.push(v);
      }
      rows.push(cells);
    }
    tables.push(rows);
  }
  return tables;
}
const tables = parseTables(html);

// ---- 4. Build raw maps ----
// 2-digit entries: table 0 rows (00/11/22/33/44/55) + the "欲望数字" paragraphs (00/01..09 etc.)
// 3-digit entries: table 1 rows (000/111/.../888/108) + the "星球例句" paragraphs (666/777/999/101010)

const twoDigit = {};
// table 0: [number, gua, dictText, coreMeaning]
for (const row of (tables[0] || []).slice(1)) {
  if (/^\d{2}$/.test(row[0])) {
    twoDigit[row[0]] = { gua: row[1] || '', dict: row[2] || '', core: row[3] || '', from: 'table' };
  }
}
// 欲望数字 paragraphs: collect EVERY paragraph that defines the token, verbatim.
// Each token d has a "0d / d0" pair and a "0-d -d0" form in the source.
const twoDigitPatterns = {
  '00': [/欲望数字： 00 00/, /0-0\s*-\s*00/, /00 黑洞白洞/, /00 太阳系/],
  '01': [/\b01 10\b/, /0-\s*1\s*-\s*10/, /\b01 二进制/],
  '02': [/\b02 20\b/, /0-2\s*-\s*20/],
  '03': [/\b03 30\b/, /0-3\s*-\s*30/],
  '04': [/\b04 40\b/, /0-4\s*-\s*40/],
  '05': [/\b05 50\b/, /0-5\s*-\s*50/],
  '06': [/\b06 60\b/, /0-6\s*-\s*60/],
  '07': [/\b07 70\b/, /0-7\s*-\s*70/],
  '08': [/\b08 80\b/, /0-8\s*-\s*80/],
  '09': [/\b09 90\b/, /0-9\s*-\s*90/],
};
for (const [key, patterns] of Object.entries(twoDigitPatterns)) {
  const hits = paras.filter((p) => patterns.some((re) => re.test(p)));
  if (hits.length) {
    twoDigit[key] = {
      ...(twoDigit[key] || {}),
      raw: hits.join(' '),
      from: 'paragraph',
    };
  }
}

const threeDigit = {};
// table 1
for (const row of (tables[1] || []).slice(1)) {
  if (/^\d{3}$/.test(row[0])) {
    threeDigit[row[0]] = { reading: row[1] || '', core: row[2] || '', from: 'table' };
  }
}
// 星球例句 行 paragraphs
const threeDigitAnchors = {
  '666': '18.666 行', '777': '20.777 行', '999': '25.999 行', '101010': '27.101010 行',
};
for (const [key, anchor] of Object.entries(threeDigitAnchors)) {
  // prefer the longer paragraph containing the anchor + extra explanation
  const hits = paras.filter((p) => p.includes(anchor));
  if (hits.length) {
    const best = hits.sort((a, b) => b.length - a.length)[0];
    threeDigit[key] = { ...(threeDigit[key] || {}), raw: best, from: 'paragraph' };
  }
}

// ---- 5. Write the generated module (literal copies) ----
const header = [
  '// GENERATED by scripts/extract.mjs — verbatim copies from the source MHTML (CC-BY).',
  '// Source: 卡巴拉51词典20260830 51dictionary+recopy+CCBY+version.mhtml',
  '// Do not edit by hand; re-run `node scripts/extract.mjs` to refresh.',
  '',
].join('\n');

const out =
  header +
  'export const TWO_DIGIT = ' + JSON.stringify(twoDigit, null, 2) + ';\n\n' +
  'export const THREE_DIGIT = ' + JSON.stringify(threeDigit, null, 2) + ';\n';

writeFileSync(join(root, 'src', 'raw-dictionary.js'), out, 'utf8');

console.log('Extracted 2-digit keys:', Object.keys(twoDigit).join(', '));
console.log('Extracted 3-digit keys:', Object.keys(threeDigit).join(', '));
console.log('Wrote src/raw-dictionary.js');
