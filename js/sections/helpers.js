// Utilidades compartidas por las secciones.
import { toNum, mes } from '../format.js';
import { ofDate, ofMonth, mesNumero } from '../freshness.js';

// ---------- Fecha de corte de cada fuente (consultas pequeñas y cacheadas) ----------
export async function corteFecha(q, key, field, where) {
  const [r] = await q(key, { $select: `max(${field}) as m`, ...(where ? { $where: where } : {}) });
  return ofDate(r?.m);
}

// El RNT publica el mes de corte como texto ("AGOSTO") y el año por separado.
export async function corteRnt(q, M) {
  const [r] = await q('rnt', { $select: 'max(ano) as ano, max(periodo) as periodo', $where: `cod_mun='${M.dane}'` });
  return ofMonth(r?.ano, mesNumero(r?.periodo), { kind: 'snapshot' });
}

// Año corrido hasta la fecha de corte (incluida) del año del corte y del anterior.
const pad = n => String(n).padStart(2, '0');
export function ytdWhere(field, c) {
  const md = `${pad(c.m)}-${pad(c.d || 28)}`;
  return `((${field} between '${c.y}-01-01' and '${c.y}-${md}T23:59:59') or (${field} between '${c.y - 1}-01-01' and '${c.y - 1}-${md}T23:59:59'))`;
}
export const ytdLabel = c => `1 ene–${c.d ? `${c.d} ` : ''}${mes(c.m)}`;

export const THIS_YEAR = new Date().getFullYear();

// Serie anual continua (rellena años faltantes con 0) a partir de filas {y, n}.
export function annual(rows, { y = 'y', v = 'n', from, to = THIS_YEAR, fill = 0 } = {}) {
  const map = new Map(rows.filter(r => r[y] != null).map(r => [Number(r[y]), toNum(r[v])]));
  const years = [...map.keys()];
  if (!years.length) return { labels: [], data: [], years: [] };
  const start = Math.max(from ?? Math.min(...years), Math.min(...years));
  const end = Math.min(to, Math.max(...years));
  const out = { labels: [], data: [], years: [] };
  for (let yr = start; yr <= end; yr++) {
    out.years.push(yr);
    out.labels.push(String(yr));
    out.data.push(map.has(yr) ? map.get(yr) : fill);
  }
  return out;
}

// Marca el último año como parcial cuando corresponde al año en curso.
export function markPartial(series) {
  const partial = series.years?.at(-1) === THIS_YEAR;
  if (partial) series.labels[series.labels.length - 1] = `${THIS_YEAR}*`;
  return partial;
}

export const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (toNum(f(x)) || 0), 0);

// Agrupa las filas por clave y suma un valor.
export function groupSum(rows, keyFn, valFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + (toNum(valFn(r)) || 0));
  }
  return m;
}

// Toma las N categorías mayores y agrupa el resto en "Otros".
export function topN(entries, n, otherLabel = 'Otros') {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  if (sorted.length <= n) return sorted;
  const head = sorted.slice(0, n - 1);
  const rest = sorted.slice(n - 1).reduce((a, [, v]) => a + v, 0);
  return [...head, [otherLabel, rest]];
}

export const like = (field, text) => `upper(${field}) like '%${text.toUpperCase()}%'`;

// Normaliza textos con problemas de codificación (p. ej. "Desaparici�n" / "Desaparición").
export function textKey(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[a-zA-Z][̀-ͯ]+/g, '')
    .replace(/[^a-zA-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const cleanLabel = s => String(s ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

export function yearRange(from, to = THIS_YEAR) {
  const out = [];
  for (let y = from; y <= to; y++) out.push(y);
  return out;
}
