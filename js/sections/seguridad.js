import { DELITOS } from '../sources.js';
import { num, toNum, change, signedPct, mes, MESES_CORTOS, fecha, titleCase } from '../format.js';
import { THIS_YEAR } from './helpers.js';

// Serie mensual completa de un delito para Villeta (una sola consulta por delito, reutilizada por todas las tarjetas).
const monthly = (q, M, d) => q(`delito_${d.key}`, {
  $select: 'date_extract_y(fecha_hecho) as y, date_extract_m(fecha_hecho) as m, sum(cantidad) as n',
  $where: `cod_muni='${M.dane}'`, $group: 'y, m', $order: 'y, m', $limit: 2000,
});

// Fecha de corte de la publicación (último hecho registrado a nivel nacional).
async function cutoff(q) {
  const [r] = await q('delito_hurto_personas', { $select: 'max(fecha_hecho) as m' });
  const d = new Date(r.m);
  let y = d.getFullYear();
  let m = d.getDate() >= 28 ? d.getMonth() + 1 : d.getMonth();
  if (m === 0) { y -= 1; m = 12; }
  return { date: d, y, m };
}

const total = (rows, y, upToMonth = 12) => rows.filter(r => Number(r.y) === y && Number(r.m) <= upToMonth).reduce((a, r) => a + toNum(r.n), 0);

function deltaHtml(v) {
  if (v == null || !Number.isFinite(v)) return '<span class="muted">—</span>';
  if (v === 0) return '<span class="delta neutral">● 0 %</span>';
  const up = v > 0;
  return `<span class="delta ${up ? 'bad' : 'good'}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${signedPct(v)}</span>`;
}

const smallMultiple = d => ({
  type: 'chart',
  title: d.nombre,
  subtitle: 'Casos por año',
  sources: [`delito_${d.key}`],
  async load({ q, M, filters }) {
    const rows = await monthly(q, M, d);
    const from = Number(filters.desde);
    const years = [];
    for (let y = from; y <= THIS_YEAR; y++) years.push(y);
    const data = years.map(y => total(rows, y));
    if (!data.some(v => v > 0)) return { empty: true, emptyText: `Sin casos registrados en ${M.nombre} desde ${from}.` };
    return {
      labelTitle: 'Año',
      chart: { kind: 'bar', height: 220, labels: years.map(y => (y === THIS_YEAR ? `${y}*` : String(y))), series: [{ name: d.nombre, data }], yoy: true, partialLast: true },
    };
  },
});

export default {
  id: 'seguridad',
  title: 'Seguridad y convivencia',
  intro: 'Delitos y conductas registradas por la Policía Nacional en Villeta, publicadas por el Ministerio de Defensa. Incluye comparativo del año corrido frente al mismo periodo del año anterior y la serie histórica de cada delito.',
  filters: [
    { id: 'desde', label: 'Serie histórica desde', default: '2010', options: [{ value: '2003', label: '2003' }, { value: '2010', label: '2010' }, { value: '2016', label: '2016' }, { value: String(THIS_YEAR - 5), label: String(THIS_YEAR - 5) }] },
    { id: 'delito', label: 'Delito para el comparativo mensual', default: 'hurto_personas', options: DELITOS.map(d => ({ value: d.key, label: d.nombre })) },
  ],
  blocks: [
    {
      type: 'table',
      title: 'Comparativo año corrido',
      subtitle: 'Casos registrados en Villeta: mismo periodo del año actual frente al anterior',
      wide: true,
      sources: ['delito_hurto_personas'],
      async load({ q, M }) {
        const cut = await cutoff(q);
        const series = await Promise.all(DELITOS.map(d => monthly(q, M, d).then(rows => ({ d, rows }))));
        const per = `ene–${mes(cut.m)}`;
        const rows = series.map(({ d, rows: r }) => {
          const cur = total(r, cut.y, cut.m);
          const prev = total(r, cut.y - 1, cut.m);
          return { delito: d.nombre, prev, cur, var: change(cur, prev), full1: total(r, cut.y - 1), full2: total(r, cut.y - 2) };
        });
        return {
          table: {
            columns: [
              { key: 'delito', label: 'Delito' },
              { key: 'prev', label: `${per} ${cut.y - 1}`, align: 'right', format: v => num(v) },
              { key: 'cur', label: `${per} ${cut.y}`, align: 'right', format: v => num(v) },
              { key: 'var', label: 'Variación', align: 'right', html: v => deltaHtml(v) },
              { key: 'full1', label: `Año ${cut.y - 1}`, align: 'right', format: v => num(v) },
              { key: 'full2', label: `Año ${cut.y - 2}`, align: 'right', format: v => num(v) },
            ],
            rows,
          },
          maxHeight: 720,
          note: `Datos con corte al ${fecha(cut.date)} (último hecho publicado). Variación ▲ = aumento de casos (desfavorable); ▼ = disminución. Con conteos bajos, las variaciones porcentuales son muy sensibles: lea también los valores absolutos. Fuentes: un conjunto de datos del Ministerio de Defensa por cada delito (ver enlaces en cada gráfico).`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Comparativo mensual del delito seleccionado',
      subtitle: 'Casos por mes en los últimos tres años (cambie el delito en el filtro superior)',
      wide: true,
      async load({ q, M, filters }) {
        const d = DELITOS.find(x => x.key === filters.delito) || DELITOS[0];
        const rows = await monthly(q, M, d);
        const cut = await cutoff(q);
        const years = [cut.y - 2, cut.y - 1, cut.y];
        return {
          labelTitle: 'Mes',
          chart: {
            kind: 'line', labels: MESES_CORTOS,
            series: years.map(y => ({
              name: `${y}`,
              data: MESES_CORTOS.map((_, i) => (y === cut.y && i + 1 > cut.m ? null : total(rows.filter(r => Number(r.m) === i + 1), y))),
            })),
          },
          note: `${d.nombre}. El año ${cut.y} llega hasta ${mes(cut.m)}. Los picos de un solo mes pueden deberse a eventos puntuales (p. ej. un fin de semana de festividades con alta afluencia de visitantes); la consulta API permite revisar el detalle por día.`,
        };
      },
    },
    { type: 'heading', title: 'Serie histórica por delito', text: 'Barras por año desde el año elegido en el filtro. La barra atenuada (*) es el año en curso, con datos parciales. Los saltos alrededor de 2016 coinciden con cambios en el sistema de registro de denuncias: compare con cautela antes y después de ese año.' },
    ...DELITOS.map(smallMultiple),
    { type: 'heading', title: 'Detalle por modalidad' },
    {
      type: 'chart',
      title: 'Hurto a vehículos por tipo',
      subtitle: 'Casos por año según el tipo de vehículo',
      async load({ q, M, filters }) {
        const rows = await q('delito_hurto_vehiculos', { $select: 'date_extract_y(fecha_hecho) as y, tipo_delito as t, sum(cantidad) as n', $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01'`, $group: 'y, t', $order: 'y' });
        if (!rows.length) return { empty: true };
        const years = [...new Set(rows.map(r => Number(r.y)))].sort();
        const tipos = [...new Set(rows.map(r => r.t))];
        return {
          labelTitle: 'Año',
          chart: {
            kind: 'stacked', partialLast: years.at(-1) === THIS_YEAR,
            labels: years.map(y => (y === THIS_YEAR ? `${y}*` : String(y))),
            series: tipos.map(t => ({ name: titleCase(t), data: years.map(y => toNum(rows.find(r => Number(r.y) === y && r.t === t)?.n) || 0) })),
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Delitos contra el medio ambiente por conducta',
      subtitle: 'Casos acumulados desde el año del filtro',
      async load({ q, M, filters }) {
        const rows = await q('delito_ambiente', { $select: 'descripcion_conducta as c, sum(cantidad) as n', $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01'`, $group: 'c', $order: 'n DESC' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Conducta', chart: { kind: 'hbar', labels: rows.map(r => titleCase(r.c)), series: [{ name: 'Casos', data: rows.map(r => toNum(r.n)) }] } };
      },
    },
    {
      type: 'chart',
      title: 'Delitos informáticos por conducta',
      subtitle: 'Casos acumulados desde el año del filtro',
      async load({ q, M, filters }) {
        const rows = await q('delito_informaticos', { $select: 'descripcion_conducta as c, sum(cantidad) as n', $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01'`, $group: 'c', $order: 'n DESC' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Conducta', chart: { kind: 'hbar', labels: rows.map(r => titleCase(r.c)), series: [{ name: 'Casos', data: rows.map(r => toNum(r.n)) }] } };
      },
    },
  ],
};
