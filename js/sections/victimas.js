import { num, toNum } from '../format.js';
import { textKey } from './helpers.js';
import { ofDate, parseDate } from '../freshness.js';

const hasMojibake = s => /[�¨®]/.test(s);

// Repara las tildes y eñes dañadas que trae la fuente en algunos cortes ("Desaparici�n", "Ni�os").
const repair = s => String(s)
  .replace(/¨®|Ã³/g, '�')
  .replace(/ci�n/g, 'ción')
  .replace(/Ni�([oa])/g, 'Niñ$1')
  .replace(/ni�([oa])/g, 'niñ$1')
  .replace(/F�sicas/g, 'Físicas')
  .replace(/Psicol�gicas/g, 'Psicológicas');

// Los conjuntos de la UARIV acumulan un corte por mes (fecha_corte en formatos mixtos):
// hay que quedarse solo con el más reciente o las cifras se multiplican.
async function ultimoCorte(q, key, M) {
  const rows = await q(key, { $select: 'fecha_corte, count(*) as n', $where: `cod_ciudad_muni=${M.dane}`, $group: 'fecha_corte' });
  let best = null;
  for (const r of rows) {
    const d = parseDate(r.fecha_corte);
    if (d && (!best || d > best.d)) best = { d, raw: r.fecha_corte };
  }
  return best;
}

export default {
  id: 'victimas',
  title: 'Víctimas del conflicto armado',
  intro: 'Personas víctimas registradas en el Registro Único de Víctimas (RUV) por hechos ocurridos en Villeta, y flujos anuales de desplazamiento forzado (personas expulsadas desde el municipio y personas que llegaron a él). Se usa el corte más reciente publicado por la Unidad para las Víctimas.',
  blocks: [
    {
      type: 'chart',
      title: 'Desplazamiento forzado por año',
      subtitle: 'Personas expulsadas desde Villeta (ocurrencia) y personas que llegaron desplazadas (recepción)',
      wide: true,
      async load({ q, M }) {
        const corte = await ultimoCorte(q, 'uariv_desplazamiento', M);
        if (!corte) return { empty: true };
        const rows = await q('uariv_desplazamiento', { $select: 'vigencia, sum(per_ocu) as o, sum(per_llegada) as l', $where: `cod_ciudad_muni=${M.dane} and fecha_corte='${corte.raw}'`, $group: 'vigencia', $order: 'vigencia' });
        if (!rows.length) return { empty: true };
        const tot = k => rows.reduce((a, r) => a + (toNum(r[k]) || 0), 0);
        return {
          labelTitle: 'Año',
          asOf: ofDate(corte.d),
          chart: { kind: 'line', labels: rows.map(r => r.vigencia), series: [{ name: 'Expulsión (ocurrencia en Villeta)', data: rows.map(r => toNum(r.o)) }, { name: 'Llegada a Villeta', data: rows.map(r => toNum(r.l)) }] },
          note: `Total histórico: ${num(tot('o'))} personas expulsadas y ${num(tot('l'))} recibidas. Una persona puede desplazarse más de una vez.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Víctimas por hecho victimizante',
      subtitle: 'Personas con hechos ocurridos en Villeta (acumulado histórico)',
      wide: true,
      async load({ q, M }) {
        const corte = await ultimoCorte(q, 'uariv_hechos', M);
        if (!corte) return { empty: true };
        const rows = await q('uariv_hechos', { $select: 'hecho, sum(per_ocu) as o, sum(per_decla) as d', $where: `cod_ciudad_muni=${M.dane} and fecha_corte='${corte.raw}'`, $group: 'hecho' });
        // Une variantes del mismo hecho con errores de codificación en la fuente.
        const m = new Map();
        for (const r of rows) {
          const k = textKey(r.hecho);
          const e = m.get(k) || { label: r.hecho, o: 0, d: 0 };
          if (hasMojibake(e.label) && !hasMojibake(r.hecho)) e.label = r.hecho;
          e.o += toNum(r.o) || 0;
          e.d += toNum(r.d) || 0;
          m.set(k, e);
        }
        const data = [...m.values()].map(e => ({ ...e, label: repair(e.label) })).filter(e => e.o > 0 && !/sin informaci/i.test(e.label)).sort((a, b) => b.o - a.o);
        if (!data.length) return { empty: true };
        return {
          labelTitle: 'Hecho victimizante',
          asOf: ofDate(corte.d),
          chart: { kind: 'hbar', labels: data.map(d => d.label), series: [{ name: 'Personas (ocurrencia)', data: data.map(d => d.o) }] },
          table: { columns: [{ key: 'label', label: 'Hecho' }, { key: 'o', label: 'Personas por ocurrencia', align: 'right', format: v => num(v) }, { key: 'd', label: 'Personas por declaración', align: 'right', format: v => num(v) }], rows: data },
          note: 'Ocurrencia: el hecho sucedió en Villeta. Declaración: la víctima declaró en Villeta.',
        };
      },
    },
  ],
};
