import { num, toNum, titleCase } from '../format.js';

// Agrupa resultados del ICFES por año (un año puede tener varios periodos: calendario A y B).
function porAnio(rows) {
  const m = new Map();
  for (const r of rows) {
    const y = String(r.periodo).slice(0, 4);
    const n = toNum(r.n) || 0;
    const e = m.get(y) || { y, n: 0, wsum: {}, wn: {} };
    e.n += n;
    for (const k of Object.keys(r)) {
      if (!k.startsWith('p_')) continue;
      const v = toNum(r[k]);
      if (v == null) continue;
      e.wsum[k] = (e.wsum[k] || 0) + v * n;
      e.wn[k] = (e.wn[k] || 0) + n;
    }
    m.set(y, e);
  }
  return [...m.values()].sort((a, b) => a.y.localeCompare(b.y)).map(e => ({
    y: e.y, n: e.n, ...Object.fromEntries(Object.keys(e.wsum).map(k => [k, e.wsum[k] / e.wn[k]])),
  }));
}

const AREAS = [
  ['p_lc', 'punt_lectura_critica', 'Lectura crítica'],
  ['p_mat', 'punt_matematicas', 'Matemáticas'],
  ['p_soc', 'punt_sociales_ciudadanas', 'Sociales y ciudadanas'],
  ['p_nat', 'punt_c_naturales', 'Ciencias naturales'],
  ['p_ing', 'punt_ingles', 'Inglés'],
];
const SELECT_ICFES = `periodo, count(*) as n, avg(punt_global::number) as p_global, ${AREAS.map(([a, c]) => `avg(${c}::number) as ${a}`).join(', ')}`;

export default {
  id: 'educacion',
  title: 'Educación y cultura',
  intro: 'Cobertura, eficiencia interna y conectividad de los colegios (Ministerio de Educación), resultados de las pruebas Saber 11 (ICFES) comparados con el promedio de Cundinamarca, y atención de programas culturales.',
  blocks: [
    { type: 'heading', title: 'Educación preescolar, básica y media' },
    {
      type: 'chart',
      title: 'Cobertura educativa',
      subtitle: 'Tasa de cobertura neta y bruta (%) por año',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, cobertura_neta, cobertura_bruta', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', format: 'pct', labels: rows.map(r => r.a_o), series: [{ name: 'Cobertura neta', data: rows.map(r => toNum(r.cobertura_neta)) }, { name: 'Cobertura bruta', data: rows.map(r => toNum(r.cobertura_bruta)) }] },
          note: 'La cobertura bruta puede superar 100 % porque incluye estudiantes en extraedad o de otros municipios.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Deserción, reprobación y repitencia',
      subtitle: 'Tasas (%) por año',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, deserci_n, reprobaci_n, repitencia', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', format: 'pct', labels: rows.map(r => r.a_o), series: [{ name: 'Deserción', data: rows.map(r => toNum(r.deserci_n)) }, { name: 'Reprobación', data: rows.map(r => toNum(r.reprobaci_n)) }, { name: 'Repitencia', data: rows.map(r => toNum(r.repitencia)) }] },
        };
      },
    },
    {
      type: 'chart',
      title: 'Población en edad escolar (5 a 16 años)',
      subtitle: 'Proyección usada por el MEN para calcular cobertura',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, poblaci_n_5_16', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', chart: { kind: 'bar', labels: rows.map(r => r.a_o), series: [{ name: 'Población 5–16 años', data: rows.map(r => toNum(r.poblaci_n_5_16)) }], yoy: true } };
      },
    },
    {
      type: 'chart',
      title: 'Sedes educativas conectadas a internet',
      subtitle: 'Porcentaje de sedes con conexión',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, sedes_conectadas_a_internet', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', chart: { kind: 'bar', format: 'pct', labels: rows.map(r => r.a_o), series: [{ name: 'Sedes conectadas', data: rows.map(r => toNum(r.sedes_conectadas_a_internet)) }], max: 100 } };
      },
    },
    { type: 'heading', title: 'Pruebas Saber 11 (ICFES)', text: 'Resultados de los estudiantes de colegios ubicados en Villeta. El puntaje global (0–500) se publica desde el segundo semestre de 2014.' },
    {
      type: 'chart',
      title: 'Puntaje global promedio: Villeta frente a Cundinamarca',
      subtitle: 'Promedio anual ponderado por número de evaluados',
      wide: true,
      async load({ q, M }) {
        const [vil, dep] = await Promise.all([
          q('icfes', { $select: 'periodo, count(*) as n, avg(punt_global::number) as p_global', $where: `cole_cod_mcpio_ubicacion='${M.dane}'`, $group: 'periodo', $order: 'periodo' }),
          q('icfes', { $select: 'periodo, count(*) as n, avg(punt_global::number) as p_global', $where: `cole_cod_depto_ubicacion='${M.daneDepto}'`, $group: 'periodo', $order: 'periodo' }),
        ]);
        const v = porAnio(vil).filter(r => r.p_global != null && r.n >= 20);
        const d = new Map(porAnio(dep).map(r => [r.y, r.p_global]));
        if (!v.length) return { empty: true };
        const faltan = [];
        for (let y = Number(v[0].y); y <= Number(v.at(-1).y); y++) if (!v.some(r => Number(r.y) === y)) faltan.push(y);
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', format: 'dec', beginAtZero: false, labels: v.map(r => r.y), series: [{ name: M.nombre, data: v.map(r => r.p_global) }, { name: `Promedio ${M.departamento}`, data: v.map(r => d.get(r.y) ?? null) }] },
          table: {
            columns: [{ key: 'y', label: 'Año' }, { key: 'n', label: 'Evaluados en Villeta', align: 'right', format: x => num(x) }, { key: 'p', label: 'Puntaje Villeta', align: 'right', format: x => num(x, 1) }, { key: 'd', label: `Puntaje ${M.departamento}`, align: 'right', format: x => num(x, 1) }],
            rows: v.map(r => ({ y: r.y, n: r.n, p: r.p_global, d: d.get(r.y) })),
          },
          note: `El conjunto "Resultados únicos Saber 11" del ICFES en datos.gov.co llega hasta 2022. Años con menos de 20 evaluados se omiten.${faltan.length ? ` Sin datos suficientes en la fuente para: ${faltan.join(', ')}.` : ''}`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Puntaje promedio por área',
      subtitle: 'Villeta, promedio anual (0–100)',
      wide: true,
      async load({ q, M }) {
        const rows = await q('icfes', { $select: SELECT_ICFES, $where: `cole_cod_mcpio_ubicacion='${M.dane}'`, $group: 'periodo', $order: 'periodo' });
        const v = porAnio(rows).filter(r => r.p_lc != null && r.n >= 20);
        if (!v.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', format: 'dec', beginAtZero: false, labels: v.map(r => r.y), series: AREAS.map(([a, , name]) => ({ name, data: v.map(r => r[a] ?? null) })) },
        };
      },
    },
    {
      type: 'table',
      title: 'Resultados por colegio (último año disponible)',
      subtitle: 'Puntaje global promedio y número de evaluados por establecimiento',
      wide: true,
      async load({ q, M }) {
        const [last] = await q('icfes', { $select: 'max(periodo) as p', $where: `cole_cod_mcpio_ubicacion='${M.dane}' and punt_global is not null` });
        if (!last?.p) return { empty: true };
        const year = String(last.p).slice(0, 4);
        const rows = await q('icfes', {
          $select: 'cole_nombre_establecimiento as c, cole_naturaleza as nat, cole_area_ubicacion as area, count(*) as n, avg(punt_global::number) as g',
          $where: `cole_cod_mcpio_ubicacion='${M.dane}' and periodo like '${year}%'`, $group: 'c, nat, area', $order: 'g DESC',
        });
        return {
          table: {
            columns: [
              { key: 'c', label: 'Establecimiento', format: v => titleCase(v) },
              { key: 'nat', label: 'Naturaleza', format: v => titleCase(v) },
              { key: 'area', label: 'Zona', format: v => titleCase(v) },
              { key: 'n', label: 'Evaluados', align: 'right', format: v => num(toNum(v)) },
              { key: 'g', label: 'Puntaje global', align: 'right', format: v => num(toNum(v), 1) },
            ],
            rows,
          },
          note: `Año ${year}.`,
        };
      },
    },
    { type: 'heading', title: 'Cultura' },
    {
      type: 'chart',
      title: 'Personas atendidas por programas del Ministerio de las Culturas',
      subtitle: 'Total de personas atendidas por vigencia',
      async load({ q, M }) {
        const rows = await q('mincultura', { $select: 'vigencia, sum(total_personas_atendidas) as n', $where: `divipola='${M.dane}'`, $group: 'vigencia', $order: 'vigencia' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Vigencia', chart: { kind: 'bar', labels: rows.map(r => r.vigencia), series: [{ name: 'Personas atendidas', data: rows.map(r => toNum(r.n)) }], yoy: true } };
      },
    },
  ],
};
