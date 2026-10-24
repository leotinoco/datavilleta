// Vigencia del dato: a qué periodo corresponde el dato más reciente de un gráfico y si está
// actualizado, con rezago o desactualizado frente a la fecha de hoy.
import { mes } from './format.js';

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Convierte los distintos formatos de fecha de las fuentes a Date.
export function parseDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return new Date(v < 1e11 ? v * 1000 : v); // segundos (Socrata) o milisegundos
  const s = String(v).trim();
  let m;
  if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return new Date(+m[1], +m[2] - 1, +m[3]); // 20261002
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) return new Date(+m[3], +m[2] - 1, +m[1]); // 31/12/2025
  if ((m = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(s))) return new Date(+m[1], +m[2] - 1, +m[3]); // 2026-06-30T… o 2026/10/02 …
  if ((m = /([a-z]{3})[a-z]*\s+(\d{1,2})\s+(\d{4})/i.exec(s))) { // "Mar 12 2026  3:11PM"
    const i = MESES_EN.indexOf(m[1].toLowerCase());
    if (i >= 0) return new Date(+m[3], i, +m[2]);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const mesNumero = nombre => MESES_ES.indexOf(String(nombre || '').trim().toLowerCase()) + 1 || null;

// Constructores de "fecha del dato" según la granularidad de la fuente.
export const ofYear = (y, extra = {}) => (y ? { y: Number(y), g: 'year', ...extra } : null);
export const ofMonth = (y, m, extra = {}) => (y && m ? { y: Number(y), m: Number(m), g: 'month', ...extra } : ofYear(y, extra));
export const ofQuarter = (y, q, extra = {}) => (y && q ? { y: Number(y), m: Number(q) * 3, q: Number(q), g: 'quarter', ...extra } : ofYear(y, extra));
export function ofDate(v, extra = {}) {
  const d = parseDate(v);
  return d ? { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), g: 'day', ...extra } : null;
}

function periodEnd(a) {
  if (a.g === 'year') return new Date(a.y, 11, 31);
  if (a.g === 'day') return new Date(a.y, a.m - 1, a.d);
  return new Date(a.y, a.m, 0); // último día del mes (o del trimestre)
}

function text(a) {
  if (a.g === 'year') return String(a.y);
  if (a.g === 'quarter') return `T${a.q} ${a.y} (${mes(a.m)})`;
  if (a.g === 'day') return `${a.d} ${mes(a.m)} ${a.y}`;
  return `${mes(a.m)} ${a.y}`;
}

const STATUS = {
  ok: { label: 'Actualizado', icon: '✓' },
  lag: { label: 'Con rezago', icon: '◔' },
  old: { label: 'Desactualizado', icon: '!' },
  closed: { label: 'Serie cerrada', icon: '■' },
};

// Umbrales: anual → año actual o anterior = actualizado, hace 2 años = rezago, más = desactualizado.
// Mensual/diario → hasta 3 meses actualizado, hasta 12 con rezago. Trimestral → hasta 6 y 15 meses.
export function describe(a, now = new Date()) {
  if (!a) return null;
  const months = Math.max(0, (now - periodEnd(a)) / (1000 * 3600 * 24 * 30.44));
  let status;
  if (a.closed) status = 'closed';
  else if (a.g === 'year') {
    const diff = now.getFullYear() - a.y;
    status = diff <= 1 ? 'ok' : diff === 2 ? 'lag' : 'old';
  } else {
    const [okMax, lagMax] = a.g === 'quarter' ? [6, 15] : [3, 12];
    status = months <= okMax ? 'ok' : months <= lagMax ? 'lag' : 'old';
  }
  const prefix = a.kind === 'portal' ? 'Publicado en el portal' : a.kind === 'snapshot' ? 'Corte del registro' : 'Dato más reciente';
  return { text: text(a), prefix, status, ...STATUS[status], months: Math.round(months) };
}

export const CRITERIO = 'Actualizado: dato anual del año actual o anterior, o dato mensual de hace 3 meses o menos (6 si es trimestral). Con rezago: hasta 2 años (anual) o 12 meses (mensual). Desactualizado: más antiguo. Serie cerrada: la fuente dejó de publicarla y continúa en otra serie.';
