import { num, toNum, titleCase } from '../format.js';
import { textKey, sum } from './helpers.js';
import { ofDate, parseDate } from '../freshness.js';

const hasMojibake = s => /[¨®]/.test(s);

// Repara las tildes y eñes dañadas que trae la fuente en algunos cortes ("Desaparicin", "Nios").
const repair = s => String(s)
  .replace(/¨®|Ã³/g, '')
  .replace(/cin/g, 'ción')
  .replace(/Ni([oa])/g, 'Niñ$1')
  .replace(/ni([oa])/g, 'niñ$1')
  .replace(/Fsicas/g, 'Físicas')
  .replace(/Psicolgicas/g, 'Psicológicas');

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

const ORDEN_CICLO = ['entre 0 y 5', 'entre 6 y 11', 'entre 12 y 17', 'entre 18 y 28', 'entre 29 y 59', 'entre 60 y 110'];

export default {
  id: 'victimas',
  title: 'Víctimas del conflicto y restitución de tierras',
  intro: 'Personas registradas en el Registro Único de Víctimas (RUV – UARIV) por hechos ocurridos o declarados en Villeta, flujos anuales de desplazamiento forzado (expulsión y recepción), caracterización demográfica por ciclo vital y sexo, y solicitudes en el Registro de Tierras Despojadas y Abandonadas Forzosamente (Unidad de Restitución de Tierras).',
  blocks: [
    {
      type: 'heading',
      title: 'Registro Único de Víctimas (UARIV)',
      text: 'Cifras del corte más reciente publicado por la Unidad para la Atención y Reparación Integral a las Víctimas para el municipio de Villeta.',
    },
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
    {
      type: 'chart',
      title: 'Víctimas por ciclo vital y sexo',
      subtitle: 'Distribución demográfica de las víctimas por hechos ocurridos en Villeta',
      async load({ q, M }) {
        const corte = await ultimoCorte(q, 'uariv_hechos', M);
        if (!corte) return { empty: true };
        const rows = await q('uariv_hechos', {
          $select: 'ciclo_vital, sexo, sum(per_ocu) as o',
          $where: `cod_ciudad_muni=${M.dane} and fecha_corte='${corte.raw}'`,
          $group: 'ciclo_vital, sexo',
        });
        if (!rows.length) return { empty: true };
        const ciclos = ORDEN_CICLO.filter(c => rows.some(r => String(r.ciclo_vital).toLowerCase() === c));
        const val = (c, s) => sum(rows.filter(r => String(r.ciclo_vital).toLowerCase() === c && new RegExp(s, 'i').test(r.sexo)), r => r.o);
        return {
          labelTitle: 'Ciclo vital (edad)',
          asOf: ofDate(corte.d),
          chart: {
            kind: 'bar',
            labels: ciclos.map(c => `${titleCase(c)} años`),
            series: [
              { name: 'Mujeres', data: ciclos.map(c => val(c, 'mujer')) },
              { name: 'Hombres', data: ciclos.map(c => val(c, 'hombre')) },
            ],
          },
          note: 'Suma por ciclo de edad de las víctimas registradas por ocurrencia en el municipio.',
        };
      },
    },

    {
      type: 'heading',
      title: 'Restitución de tierras (URT)',
      text: 'Solicitudes de inscripción en el Registro de Tierras Despojadas y Abandonadas Forzosamente (SRTDAF) sobre predios ubicados en el municipio de Villeta.',
    },
    {
      type: 'kpis',
      title: 'Solicitudes de restitución de tierras en Villeta (SRTDAF)',
      wide: true,
      async load({ q, M }) {
        const rows = await q('urt_restitucion', {
          $where: `codigodanemunicipio='${M.dane}'`,
          $limit: 5,
        });
        if (!rows.length) return { empty: true };
        const r = rows[0];
        return {
          asOf: ofDate(r.fechadecorte),
          kpis: [
            {
              label: 'Solicitudes en el SRTDAF',
              value: num(toNum(r.numerodesolicitudesenelsrtdaf)),
              hint: `${num(toNum(r.numerodesolicitudesmicrofocalizadas))} en zona microfocalizada`,
              source: 'urt_restitucion',
            },
            {
              label: 'Predios reclamados',
              value: num(toNum(r.numerodepredios)),
              hint: `${num(toNum(r.numerodetitulares))} titulares asociados`,
              source: 'urt_restitucion',
            },
            {
              label: 'Solicitudes inscritas',
              value: num(toNum(r.numerodesolicitudesinscr)),
              hint: 'Inscritas en el Registro de Tierras Despojadas',
              source: 'urt_restitucion',
            },
            {
              label: 'Solicitudes no inscritas / cerradas',
              value: num(toNum(r.numerodesolicitudesnoinscritas)),
              hint: `${num(toNum(r.numerodesolicitudesentramite))} actualmente en trámite administrativo`,
              source: 'urt_restitucion',
            },
          ],
          note: 'Estadísticas de la Unidad Administrativa Especial de Gestión de Restitución de Tierras Despojadas (URT) para predios ubicados en Villeta.',
        };
      },
    },
  ],
};
