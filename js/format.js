// Formatos numéricos y de fecha en convención colombiana (es-CO).
const nf = {};
const formatter = d => (nf[d] ??= new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: d }));

export const toNum = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.\-eE]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const num = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : formatter(d).format(v));
export const pct = (v, d = 1) => (v == null ? '—' : `${num(v, d)} %`);

export function compact(v) {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `${num(v / 1e12, 1)} billones`;
  if (a >= 1e9) return `${num(v / 1e9, 1)} mil M`;
  if (a >= 1e6) return `${num(v / 1e6, 1)} M`;
  if (a >= 1e4) return `${num(v / 1e3, 1)} mil`;
  return num(v, a < 10 ? 1 : 0);
}

export const cop = v => (v == null ? '—' : `${v < 0 ? '−' : ''}$ ${compact(Math.abs(v))}`);
export const copFull = v => (v == null ? '—' : `$ ${num(v)}`);

export function signedPct(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '—';
  const s = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${s}${num(Math.abs(v), d)} %`;
}

export const change = (cur, prev) => (cur == null || prev == null || prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const mes = m => MESES[m - 1];
export const MESES_CORTOS = MESES;
export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Periodo {y, m} a partir de una fecha ISO o de 'YYYY-MM'.
export function periodo(v) {
  const s = String(v);
  const m = /^(\d{4})-(\d{2})/.exec(s);
  return m ? { y: Number(m[1]), m: Number(m[2]) } : null;
}

export function fecha(v) {
  if (!v) return '—';
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const FORMATS = { num: v => num(v), dec: v => num(v, 1), dec2: v => num(v, 2), pct: v => pct(v), cop, compact };
export const getFormat = f => (typeof f === 'function' ? f : FORMATS[f] || FORMATS.num);

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const titleCase = s => String(s ?? '').toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
