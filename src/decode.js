// Number Dictionary — decoding logic.
//
// SPEC (per author):
//   - No single-digit meanings.
//   - Only 6-digit numbers are decoded.
//   - Interpretation A: split as 2+2+2 -> three 2-digit tokens.
//   - Interpretation B: split as 3+3   -> two 3-digit tokens.
//   - Each token's text is copied VERBATIM from 51dic.csv by
//     scripts/extract.mjs into src/raw-dictionary.js. Nothing is authored here.
//
// Shared by the Worker API (ESM import) and the web page (inlined by build.mjs).

import { TWO_DIGIT, THREE_DIGIT } from './raw-dictionary.js';

// The source pairs reversed two-digit tokens in one entry: "01 10", "02 20", ...
// So token "10" resolves to the "01" entry, "90" to "09", etc.
function normalizeTwoDigit(token) {
  if (Object.prototype.hasOwnProperty.call(TWO_DIGIT, token)) return token;
  const reversed = token[1] + token[0];
  if (Object.prototype.hasOwnProperty.call(TWO_DIGIT, reversed)) return reversed;
  return null;
}

// Return the verbatim source text for a two-digit token (or null if undocumented).
function lookupTwo(token) {
  const key = normalizeTwoDigit(token);
  if (!key) return null;
  const e = TWO_DIGIT[key];
  const verbatim = [e.gua, e.dict, e.core, e.raw].filter(Boolean).join(' ');
  return { key, text: verbatim };
}

function lookupThree(token) {
  const e = THREE_DIGIT[token];
  if (!e) return null;
  const verbatim = [e.reading, e.core, e.raw].filter(Boolean).join(' ');
  return { key: token, text: verbatim };
}

function buildInterpretation(label, mode, tokens, lookup) {
  return {
    mode,
    label,
    segments: tokens.map((token) => {
      const hit = lookup(token);
      return {
        token,
        found: Boolean(hit),
        key: hit ? hit.key : null,
        text: hit ? hit.text : null,
      };
    }),
  };
}

export function decodeNumber(raw) {
  const input = String(raw ?? '').trim();
  const digits = (input.match(/\d/g) || []).map(Number);

  if (digits.length !== 6) {
    return {
      ok: false,
      error: '本解码器只解 6 位数字（当前 ' + digits.length + ' 位）。请输入恰好 6 位数字。',
    };
  }

  const str = digits.join('');

  const interpretations = [
    buildInterpretation(
      '两两拆分 · 2+2+2',
      '2+2+2',
      [str.slice(0, 2), str.slice(2, 4), str.slice(4, 6)],
      lookupTwo
    ),
    buildInterpretation(
      '三三拆分 · 3+3',
      '3+3',
      [str.slice(0, 3), str.slice(3, 6)],
      lookupThree
    ),
  ];

  return {
    ok: true,
    input,
    digits: str,
    interpretations,
    source: '卡巴拉51词典 51 dictionary recopy (CC-BY) — 段落文字由 scripts/extract.mjs 从 51dic.csv 逐字复制',
  };
}
