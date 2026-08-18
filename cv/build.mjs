#!/usr/bin/env node
/**
 * Generador de PDF para el CV, sin dependencias.
 *
 * Usa las 14 fuentes base del estándar PDF (Helvetica), que todo lector trae
 * incorporadas. Al no embeber ni subsetear ninguna fuente, el texto queda en el
 * archivo como texto real, en orden de lectura, con operadores Tj simples:
 * cualquier parser --incluidos los ATS-- lo extrae a la primera pasada.
 *
 * Uso:  node cv/build.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));

// ───────────────────────────────────────────────────────────────────
// Métricas AFM (Helvetica). Unidades de 1/1000 em.
// ───────────────────────────────────────────────────────────────────
const W_REG = ' 278!278"355#556$556%889&667\'191(333)333*389+584,278-333.278/278005560556055605560556055605560556055605560:278;278<584=584>584?556@1015A667B667C722D722E667F611G778H722I278J500K667L556M833N722O778P667Q778R722S667T611U722V667W944X667Y667Z611[278\\278]278^469_556`333a556b556c500d556e556f278g556h556i222j222k500l222m833n556o556p556q556r333s500t278u556v500w722x500y500z500{334|260}334~584';
const W_BLD = ' 278!333"474#556$556%889&722\'238(333)333*389+584,278-333.278/278005560556055605560556055605560556055605560:333;333<584=584>584?611@975A722B722C722D722E667F611G778H722I278J556K722L611M833N722O778P667Q778R722S667T611U722V667W944X667Y667Z611[333\\278]333^584_556`333a556b611c556d611e556f333g611h611i278j278k556l278m889n611o611p611q611r389s556t333u611v556w778x556y556z500{389|280}389~584';

function parseWidths(spec) {
  const w = {};
  let i = 0;
  while (i < spec.length) {
    const ch = spec[i] === '\\' ? spec[++i] : spec[i];
    w[ch] = parseInt(spec.substr(i + 1, 3), 10);
    i += 4;
  }
  return w;
}
const WIDTHS = { reg: parseWidths(W_REG), bld: parseWidths(W_BLD) };

// Acentuados y signos: heredan el ancho de su letra base.
const BASE = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n', 'ç': 'c', 'ø': 'o',
  'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N', 'Ç': 'C', 'Ø': 'O',
  '¿': '?', '¡': '!', '·': '.', '—': 'M', '–': 'n', '‘': "'", '’': "'", '“': '"', '”': '"', '•': '.',
};

function charWidth(ch, bold) {
  const t = WIDTHS[bold ? 'bld' : 'reg'];
  if (t[ch] !== undefined) return t[ch];
  const b = BASE[ch];
  if (b && t[b] !== undefined) return t[b];
  return 556;
}

function textWidth(str, bold, size) {
  let sum = 0;
  for (const ch of str) sum += charWidth(ch, bold);
  return (sum * size) / 1000;
}

// ───────────────────────────────────────────────────────────────────
// Codificación WinAnsi + escape de strings PDF
// ───────────────────────────────────────────────────────────────────
const WINANSI = { '—': 0x97, '–': 0x96, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '…': 0x85 };

function pdfString(str) {
  let out = '';
  for (const ch of str) {
    const code = WINANSI[ch] ?? ch.codePointAt(0);
    if (code > 255) { out += '?'; continue; }          // fuera de WinAnsi
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch;
    else if (code < 32 || code > 126) out += '\\' + code.toString(8).padStart(3, '0');
    else out += ch;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────
// Layout
// ───────────────────────────────────────────────────────────────────
const PAGE_W = 595.28, PAGE_H = 841.89;
const M_X = 42, M_TOP = 46, M_BOT = 42;
const COL = PAGE_W - M_X * 2;

const INK = '0.11 0.12 0.14';
const MUTED = '0.38 0.40 0.44';
const RULE = '0.80 0.82 0.85';

// ───────────────────────────────────────────────────────────────────
// Parseo de Markdown (subconjunto acotado) → bloques
// ───────────────────────────────────────────────────────────────────
function parseMarkdown(md) {
  const blocks = [];
  const pending = [];
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (line.includes('⬜')) { pending.push(line.replace(/[⬜]/g, '').trim()); continue; }
    if (!line.trim()) { blocks.push({ type: 'blank' }); continue; }
    if (line.startsWith('### ')) blocks.push({ type: 'h3', runs: inlineRuns(line.slice(4)) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2) });
    else if (/^---+$/.test(line.trim())) blocks.push({ type: 'hr' });
    else if (line.startsWith('- ')) blocks.push({ type: 'li', runs: inlineRuns(line.slice(2)) });
    else blocks.push({ type: 'p', runs: inlineRuns(line) });
  }
  return { blocks, pending };
}

/** "texto **negrita** más" → [{text, bold}] ; también resuelve `código` a texto plano */
function inlineRuns(str) {
  const clean = str.replace(/`/g, '');
  const runs = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(clean))) {
    if (m.index > last) runs.push({ text: clean.slice(last, m.index), bold: false });
    runs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < clean.length) runs.push({ text: clean.slice(last), bold: false });
  return runs.length ? runs : [{ text: '', bold: false }];
}

/** Word-wrap sobre runs con negrita, respetando el ancho disponible. */
function wrapRuns(runs, size, maxWidth) {
  const words = [];
  for (const run of runs) {
    const parts = run.text.split(/(\s+)/).filter((s) => s !== '');
    for (const p of parts) words.push({ text: p, bold: run.bold, space: /^\s+$/.test(p) });
  }
  const lines = [];
  let cur = [], w = 0;
  for (const word of words) {
    const ww = textWidth(word.text, word.bold, size);
    if (w + ww > maxWidth && cur.length && !word.space) {
      while (cur.length && cur[cur.length - 1].space) cur.pop();
      lines.push(cur); cur = []; w = 0;
    }
    if (word.space && !cur.length) continue;            // sin espacios al inicio de línea
    cur.push(word); w += ww;
  }
  while (cur.length && cur[cur.length - 1].space) cur.pop();
  if (cur.length) lines.push(cur);
  return lines.length ? lines : [[]];
}

// ───────────────────────────────────────────────────────────────────
// Render
// ───────────────────────────────────────────────────────────────────
function render(blocks, audit) {
  const pages = [];
  let ops = [], y = PAGE_H - M_TOP;

  const newPage = () => { pages.push(ops); ops = []; y = PAGE_H - M_TOP; };
  const need = (h) => { if (y - h < M_BOT) newPage(); };

  const drawLine = (words, x, size, color) => {
    if (!words.length) return;
    let right = x;
    for (const w of words) right += textWidth(w.text, w.bold, size);
    if (right > audit.maxRight) { audit.maxRight = right; audit.widest = words.map((w) => w.text).join(''); }
    if (right > PAGE_W - M_X + 0.5) audit.overflow.push(words.map((w) => w.text).join(''));
    ops.push('BT', `${color} rg`, `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    let font = null;
    for (const word of words) {
      const f = word.bold ? '/F2' : '/F1';
      if (f !== font) { ops.push(`${f} ${size} Tf`); font = f; }
      ops.push(`(${pdfString(word.text)}) Tj`);
    }
    ops.push('ET');
  };

  const paragraph = (runs, { size = 9, lead = 12.2, x = M_X, width = COL, color = INK, indent = 0 } = {}) => {
    const lines = wrapRuns(runs, size, width);
    lines.forEach((words, i) => {
      need(lead);
      drawLine(words, i === 0 ? x : x + indent, size, color);
      y -= lead;
    });
  };

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];

    if (b.type === 'h1') {
      need(30);
      drawLine([{ text: b.text, bold: true }], M_X, 21, INK);
      y -= 25;
    } else if (b.type === 'h2') {
      need(30);
      y -= 6;
      const label = b.text.toUpperCase();
      ops.push('BT', `${MUTED} rg`, `/F2 8.6 Tf`, `1 0 0 1 ${M_X} ${y.toFixed(2)} Tm`,
        `1.1 Tc (${pdfString(label)}) Tj 0 Tc`, 'ET');
      y -= 5.5;
      ops.push(`${RULE} RG 0.6 w`, `${M_X} ${y.toFixed(2)} m ${(PAGE_W - M_X).toFixed(2)} ${y.toFixed(2)} l S`);
      y -= 12;
    } else if (b.type === 'h3') {
      need(24);
      y -= 3;
      paragraph(b.runs, { size: 10.5, lead: 13.5 });
      y -= 1;
    } else if (b.type === 'hr') {
      y -= 3;
    } else if (b.type === 'li') {
      // El marcador viaja dentro del mismo bloque de texto que la primera línea:
      // así se extrae como "· texto" y no como una línea suelta con un punto.
      // "·" + 3 espacios miden exactamente 10pt a 9pt, que es la sangría francesa.
      const lines = wrapRuns(b.runs, 9, COL - 12);
      lines.forEach((words, i) => {
        need(12.2);
        drawLine(i === 0 ? [{ text: '·   ', bold: false }, ...words] : words,
          i === 0 ? M_X + 2 : M_X + 12, 9, INK);
        y -= 12.2;
      });
      y -= 1.5;
    } else if (b.type === 'p') {
      paragraph(b.runs);
    } else if (b.type === 'blank') {
      if (next && next.type !== 'blank') y -= 4;
    }
  }
  pages.push(ops);
  return pages;
}

// ───────────────────────────────────────────────────────────────────
// Ensamblado del PDF
// ───────────────────────────────────────────────────────────────────
function buildPdf(pages, title) {
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };

  const fontReg = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBld = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const pagesId = objs.length + 1 + pages.length * 2;   // reservado
  const pageIds = [];
  for (const ops of pages) {
    const stream = ops.join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBld} 0 R >> >> /Contents ${contentId} 0 R >>`
    ));
  }
  const realPagesId = add(`<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const infoId = add(`<< /Title (${pdfString(title)}) /Author (Brian Benegas) /Creator (cv/build.mjs) >>`);
  const rootId = add(`<< /Type /Catalog /Pages ${realPagesId} 0 R >>`);

  if (realPagesId !== pagesId) {                        // guardia: el /Parent debe apuntar bien
    throw new Error(`id de /Pages inconsistente: reservado ${pagesId}, real ${realPagesId}`);
  }

  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offsets = [];
  objs.forEach((body, idx) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${rootId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// ───────────────────────────────────────────────────────────────────
const TARGETS = [
  { src: 'en.md', out: 'brian-benegas-resume-en.pdf', title: 'Brian Benegas - Full Stack Developer' },
  { src: 'es.md', out: 'brian-benegas-cv-es.pdf', title: 'Brian Benegas - Desarrollador Full Stack' },
];

for (const t of TARGETS) {
  const md = readFileSync(join(DIR, t.src), 'utf8');
  const { blocks, pending } = parseMarkdown(md);
  const audit = { maxRight: 0, widest: '', overflow: [] };
  const pages = render(blocks, audit);
  const pdf = buildPdf(pages, t.title);
  writeFileSync(join(DIR, t.out), pdf);
  console.log(`${t.out}  ${pages.length} pág  ${(pdf.length / 1024).toFixed(1)} KB`);
  console.log(`   margen derecho: línea más ancha ${audit.maxRight.toFixed(1)}pt de ${(PAGE_W - M_X).toFixed(1)}pt disponibles`);
  if (audit.overflow.length) {
    console.log(`   ✗ ${audit.overflow.length} línea(s) desbordan el margen:`);
    for (const o of audit.overflow) console.log(`      "${o.slice(0, 80)}"`);
    process.exitCode = 1;
  }
  for (const p of pending) console.log(`   ⬜ pendiente, omitido del PDF: ${p}`);
}
