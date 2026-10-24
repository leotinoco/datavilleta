import { fecha, titleCase, escapeHtml } from '../format.js';
import { discover, datasetUrl } from '../soda.js';
import { THIS_YEAR, topN } from './helpers.js';
import { ofDate } from '../freshness.js';

const UNGRD = ['ungrd_2019', 'ungrd_2020', 'ungrd_2023', 'ungrd_v2'];

async function emergencias(q, M) {
  const where = `upper(municipio) like '%${M.nombre.toUpperCase()}%' and upper(departamento) like '%${M.departamento.toUpperCase()}%'`;
  const parts = await Promise.all(UNGRD.map(k => q(k, { $select: 'fecha, evento', $where: where, $order: 'fecha', $limit: 1000 }).catch(() => [])));
  const seen = new Set();
  const out = [];
  for (const r of parts.flat()) {
    const key = `${r.fecha}|${r.evento}`;
    if (!r.fecha || seen.has(key)) continue;
    seen.add(key);
    out.push({ fecha: r.fecha, y: new Date(r.fecha).getFullYear(), evento: titleCase(String(r.evento).replace('INCENDIO DE COBERTURA VEGETAL', 'INCENDIO FORESTAL')) });
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export default {
  id: 'territorio',
  title: 'Territorio, riesgo y ambiente',
  intro: 'Emergencias atendidas y reportadas a la UNGRD, y capas oficiales de amenaza, vulnerabilidad y riesgo y cartografía básica de Villeta publicadas en datos.gov.co. El uso del suelo según el catastro está en la sección Agro.',
  blocks: [
    {
      type: 'chart',
      title: 'Emergencias reportadas a la UNGRD',
      subtitle: 'Eventos por año y tipo (años con datos abiertos: 2019, 2020, 2023 en adelante)',
      wide: true,
      async load({ q, M }) {
        const ev = await emergencias(q, M);
        if (!ev.length) return { empty: true };
        const years = [...new Set(ev.map(e => e.y))].sort();
        const counts = new Map();
        for (const e of ev) counts.set(e.evento, (counts.get(e.evento) || 0) + 1);
        const tipos = topN(counts.entries(), 5, 'Otros eventos').map(t => t[0]);
        const tipoDe = e => (tipos.includes(e.evento) ? e.evento : 'Otros eventos');
        return {
          labelTitle: 'Año',
          asOf: ofDate(ev[0].fecha),
          chart: {
            kind: 'stacked', partialLast: years.at(-1) === THIS_YEAR,
            labels: years.map(y => (y === THIS_YEAR ? `${y}*` : String(y))),
            series: tipos.map(t => ({ name: t, data: years.map(y => ev.filter(e => e.y === y && tipoDe(e) === t).length) })),
          },
          note: 'La UNGRD publica un conjunto distinto por periodo; 2021–2022 no están disponibles como datos abiertos. Los incendios de cobertura vegetal se agrupan como incendios forestales.',
        };
      },
    },
    {
      type: 'table',
      title: 'Detalle de emergencias',
      subtitle: 'Eventos más recientes primero',
      async load({ q, M }) {
        const ev = await emergencias(q, M);
        if (!ev.length) return { empty: true };
        return { asOf: ofDate(ev[0].fecha), table: { columns: [{ key: 'fecha', label: 'Fecha', format: v => fecha(v) }, { key: 'evento', label: 'Evento' }], rows: ev }, maxHeight: 420 };
      },
    },
    {
      type: 'table',
      title: 'Capas geográficas oficiales de Villeta',
      subtitle: 'Amenaza, vulnerabilidad y riesgo (incendio, inundación, avenida torrencial, remoción en masa), catastro y cartografía básica',
      wide: true,
      sourceText: 'Portal de Datos Abiertos de Colombia (datos.gov.co) – API de catálogo (Discovery API), búsqueda en vivo. Las entidades publicadoras se indican en cada fila.',
      async load({ M }) {
        const items = (await discover(M.nombre, 200)).filter(d => d.type === 'map' || d.type === 'dataset' || d.type === 'file');
        const relevantes = items.filter(d => /villeta|amenaza|riesgo|vulnerab|inundaci|incendio|remoci|torrenc|catastr|cartograf/i.test(`${d.name}`));
        if (!relevantes.length) return { empty: true };
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'name', label: 'Capa / conjunto', html: (v, r) => `<a href="${datasetUrl(r.id)}" target="_blank" rel="noopener">${escapeHtml(v)}</a>` },
              { key: 'attribution', label: 'Publicado por', format: v => v || 'Sin entidad declarada' },
              { key: 'updatedAt', label: 'Actualizado', format: v => fecha(v) },
              { key: 'id', label: 'ID' },
            ],
            rows: relevantes.sort((a, b) => a.name.localeCompare(b.name)),
          },
          maxHeight: 460,
          note: 'Listado generado en vivo con la API de catálogo de datos.gov.co (búsqueda "Villeta"). Varias capas no declaran entidad publicadora en el portal; revise el detalle de cada conjunto.',
        };
      },
    },
  ],
};
