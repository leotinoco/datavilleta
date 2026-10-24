import { num, toNum, fecha } from '../format.js';
import { textKey } from './helpers.js';

const hasMojibake = s => /[�¨®]/.test(s);

export default {
  id: 'victimas',
  title: 'Víctimas del conflicto armado',
  intro: 'Personas víctimas registradas en el Registro Único de Víctimas (RUV) por hechos ocurridos en Villeta, y flujos anuales de desplazamiento forzado (personas expulsadas desde el municipio y personas que llegaron a él).',
  blocks: [
    {
      type: 'chart',
      title: 'Desplazamiento forzado por año',
      subtitle: 'Personas expulsadas desde Villeta (ocurrencia) y personas que llegaron desplazadas (recepción)',
      wide: true,
      async load({ q, M }) {
        const rows = await q('uariv_desplazamiento', { $select: 'vigencia, sum(per_ocu) as o, sum(per_llegada) as l, max(fecha_corte) as c', $where: `cod_ciudad_muni=${M.dane}`, $group: 'vigencia', $order: 'vigencia' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', labels: rows.map(r => r.vigencia), series: [{ name: 'Expulsión (ocurrencia en Villeta)', data: rows.map(r => toNum(r.o)) }, { name: 'Llegada a Villeta', data: rows.map(r => toNum(r.l)) }] },
          note: `Corte del RUV: ${rows.at(-1).c ? fecha(rows.at(-1).c) : 'según fuente'}. Una persona puede ser víctima de varios hechos o desplazarse más de una vez.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Víctimas por hecho victimizante',
      subtitle: 'Personas con hechos ocurridos en Villeta (acumulado histórico)',
      wide: true,
      async load({ q, M }) {
        const rows = await q('uariv_hechos', { $select: 'hecho, sum(per_ocu) as o, sum(per_decla) as d', $where: `cod_ciudad_muni=${M.dane}`, $group: 'hecho' });
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
        const data = [...m.values()].filter(e => e.o > 0 && !/sin informaci/i.test(e.label)).sort((a, b) => b.o - a.o);
        if (!data.length) return { empty: true };
        return {
          labelTitle: 'Hecho victimizante',
          chart: { kind: 'hbar', labels: data.map(d => d.label), series: [{ name: 'Personas (ocurrencia)', data: data.map(d => d.o) }] },
          table: { columns: [{ key: 'label', label: 'Hecho' }, { key: 'o', label: 'Personas por ocurrencia', align: 'right', format: v => num(v) }, { key: 'd', label: 'Personas por declaración', align: 'right', format: v => num(v) }], rows: data },
          note: 'Ocurrencia: el hecho sucedió en Villeta. Declaración: la víctima declaró en Villeta.',
        };
      },
    },
  ],
};
