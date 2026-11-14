import { num, toNum, titleCase } from '../format.js';
import { ofYear } from '../freshness.js';
import { sum } from './helpers.js';

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
  title: 'Educación, cultura y formación laboral',
  intro: 'Cobertura, eficiencia interna y conectividad escolar por nivel educativo (Ministerio de Educación), resultados de las pruebas Saber 11 (ICFES) por sector y condiciones del hogar, dotación tecnológica de Computadores para Educar (MinTIC), certificación laboral del SENA y atención cultural.',
  blocks: [
    {
      type: 'heading',
      title: 'Educación preescolar, básica y media',
      text: 'Indicadores anuales de acceso, permanencia y aprobación del Ministerio de Educación Nacional (MEN) para el municipio de Villeta.',
    },
    {
      type: 'chart',
      title: 'Cobertura educativa total',
      subtitle: 'Tasa de cobertura neta y bruta (%) por año',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, cobertura_neta, cobertura_bruta', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', format: 'pct', labels: rows.map(r => r.a_o), series: [{ name: 'Cobertura neta', data: rows.map(r => toNum(r.cobertura_neta)) }, { name: 'Cobertura bruta', data: rows.map(r => toNum(r.cobertura_bruta)) }] },
          note: 'La cobertura bruta puede superar 100 % porque incluye estudiantes en extraedad o provenientes de municipios vecinos.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Cobertura neta por nivel educativo',
      subtitle: 'Transición, primaria, secundaria y educación media (%) por año',
      async load({ q, M }) {
        const rows = await q('men', {
          $select: 'a_o, cobertura_neta_transici_n, cobertura_neta_primaria, cobertura_neta_secundaria, cobertura_neta_media',
          $where: `c_digo_municipio='${M.dane}'`,
          $order: 'a_o',
        });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: {
            kind: 'line',
            format: 'pct',
            labels: rows.map(r => r.a_o),
            series: [
              { name: 'Primaria', data: rows.map(r => toNum(r.cobertura_neta_primaria)) },
              { name: 'Secundaria', data: rows.map(r => toNum(r.cobertura_neta_secundaria)) },
              { name: 'Transición', data: rows.map(r => toNum(r.cobertura_neta_transici_n)) },
              { name: 'Media (10.° y 11.°)', data: rows.map(r => toNum(r.cobertura_neta_media)) },
            ],
          },
          note: 'La educación media (grados 10.° y 11.°) y el grado de transición presentan las mayores brechas de cobertura neta frente a primaria y secundaria.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Deserción, reprobación y repitencia',
      subtitle: 'Tasas generales (%) por año en el sector oficial y no oficial',
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
      title: 'Tasa de deserción intraanual por nivel educativo',
      subtitle: 'Porcentaje de alumnos que abandonan el sistema escolar durante el año lectivo según nivel',
      async load({ q, M }) {
        const rows = await q('men', {
          $select: 'a_o, deserci_n_transici_n, deserci_n_primaria, deserci_n_secundaria, deserci_n_media',
          $where: `c_digo_municipio='${M.dane}'`,
          $order: 'a_o',
        });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: {
            kind: 'line',
            format: 'pct',
            labels: rows.map(r => r.a_o),
            series: [
              { name: 'Secundaria (6.° a 9.°)', data: rows.map(r => toNum(r.deserci_n_secundaria)) },
              { name: 'Transición', data: rows.map(r => toNum(r.deserci_n_transici_n)) },
              { name: 'Primaria (1.° a 5.°)', data: rows.map(r => toNum(r.deserci_n_primaria)) },
              { name: 'Media (10.° y 11.°)', data: rows.map(r => toNum(r.deserci_n_media)) },
            ],
          },
          note: 'La básica secundaria concentra de forma consistente la mayor tasa de deserción escolar en el municipio.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Población en edad escolar (5 a 16 años)',
      subtitle: 'Proyección demográfica DANE usada por el MEN para calcular cobertura',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, poblaci_n_5_16', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', chart: { kind: 'bar', labels: rows.map(r => r.a_o), series: [{ name: 'Población 5–16 años', data: rows.map(r => toNum(r.poblaci_n_5_16)) }], yoy: true } };
      },
    },
    {
      type: 'chart',
      title: 'Sedes educativas conectadas a internet',
      subtitle: 'Porcentaje de sedes con conexión reportada ante el MEN',
      async load({ q, M }) {
        const rows = await q('men', { $select: 'a_o, sedes_conectadas_a_internet', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', chart: { kind: 'bar', format: 'pct', labels: rows.map(r => r.a_o), series: [{ name: 'Sedes conectadas', data: rows.map(r => toNum(r.sedes_conectadas_a_internet)) }], max: 100 } };
      },
    },

    {
      type: 'heading',
      title: 'Pruebas Saber 11 (ICFES)',
      text: 'Resultados de los estudiantes de colegios ubicados en Villeta. El puntaje global (0–500) se publica en escala comparable desde el segundo semestre de 2014.',
    },
    {
      type: 'chart',
      title: 'Puntaje global promedio: Villeta frente a Cundinamarca',
      scope: { nivel: 'Comparación departamental', texto: 'la línea de Cundinamarca promedia a todos los evaluados del departamento; la de Villeta, solo a los de colegios del municipio.' },
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
      title: 'Puntaje global Saber 11 por naturaleza del colegio (Oficial vs. No oficial)',
      subtitle: 'Comparación entre establecimientos públicos y privados de Villeta',
      async load({ q, M }) {
        const rows = await q('icfes', {
          $select: 'periodo, cole_naturaleza, count(*) as n, avg(punt_global::number) as p_global',
          $where: `cole_cod_mcpio_ubicacion='${M.dane}' and punt_global is not null`,
          $group: 'periodo, cole_naturaleza',
          $order: 'periodo',
        });
        const ofi = new Map(porAnio(rows.filter(r => r.cole_naturaleza === 'OFICIAL')).map(r => [r.y, r.p_global]));
        const priv = new Map(porAnio(rows.filter(r => r.cole_naturaleza === 'NO OFICIAL')).map(r => [r.y, r.p_global]));
        const years = [...new Set([...ofi.keys(), ...priv.keys()])].sort();
        if (!years.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: {
            kind: 'line',
            format: 'dec',
            beginAtZero: false,
            labels: years,
            series: [
              { name: 'Colegios oficiales', data: years.map(y => ofi.get(y) ?? null) },
              { name: 'Colegios no oficiales (privados)', data: years.map(y => priv.get(y) ?? null) },
            ],
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Acceso a internet y computador en el hogar de los evaluados en Saber 11',
      subtitle: 'Porcentaje de estudiantes de grado 11.° en Villeta que reportan tener conexión o equipo en casa',
      async load({ q, M }) {
        const rows = await q('icfes', {
          $select: 'periodo, fami_tieneinternet, fami_tienecomputador, count(*) as n',
          $where: `cole_cod_mcpio_ubicacion='${M.dane}'`,
          $group: 'periodo, fami_tieneinternet, fami_tienecomputador',
          $order: 'periodo',
        });
        if (!rows.length) return { empty: true };
        const byYear = new Map();
        for (const r of rows) {
          const y = String(r.periodo).slice(0, 4);
          const n = toNum(r.n) || 0;
          const cur = byYear.get(y) || { totNet: 0, siNet: 0, totPc: 0, siPc: 0 };
          if (r.fami_tieneinternet === 'Si' || r.fami_tieneinternet === 'No') {
            cur.totNet += n;
            if (r.fami_tieneinternet === 'Si') cur.siNet += n;
          }
          if (r.fami_tienecomputador === 'Si' || r.fami_tienecomputador === 'No') {
            cur.totPc += n;
            if (r.fami_tienecomputador === 'Si') cur.siPc += n;
          }
          byYear.set(y, cur);
        }
        const years = [...byYear.keys()].filter(y => byYear.get(y).totNet >= 20).sort();
        return {
          labelTitle: 'Año',
          chart: {
            kind: 'line',
            format: 'pct',
            labels: years,
            series: [
              { name: 'Con internet en el hogar', data: years.map(y => (byYear.get(y).siNet / byYear.get(y).totNet) * 100) },
              { name: 'Con computador en el hogar', data: years.map(y => (byYear.get(y).siPc / (byYear.get(y).totPc || 1)) * 100) },
            ],
          },
          note: 'Cuestionario socioeconómico aplicado por el ICFES a los estudiantes de grado 11.° de colegios de Villeta.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Puntaje promedio por área evaluada',
      subtitle: 'Villeta, promedio anual por competencia (escala 0–100)',
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
          asOf: ofYear(year),
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

    {
      type: 'heading',
      title: 'Tecnología educativa y formación para el trabajo (SENA)',
      text: 'Dotación de equipos de cómputo mediante el programa Computadores para Educar (MinTIC) y certificación de formación técnica y complementaria del SENA en Villeta.',
    },
    {
      type: 'chart',
      title: 'Computadores y tabletas entregados por Computadores para Educar',
      subtitle: 'Terminales entregadas a sedes educativas de Villeta y docentes formados por año',
      async load({ q, M }) {
        const rows = await q('mintic_cpe', {
          $select: 'anio, sum(pc_entregados_mintic::number) as pc, sum(tabletas_mintic_estudiantes::number) as tab_est, sum(tabletas_mintic_docentes::number) as tab_doc, sum(pc_mintic_docentes::number) as pc_doc, sum(docentes_formados::number) as doc',
          $where: `coddane='${M.dane}'`,
          $group: 'anio',
          $order: 'anio',
        });
        const valid = rows.filter(r => (toNum(r.pc) || 0) + (toNum(r.tab_est) || 0) + (toNum(r.tab_doc) || 0) + (toNum(r.pc_doc) || 0) + (toNum(r.doc) || 0) > 0);
        if (!valid.length) return { empty: true };
        return {
          labelTitle: 'Año',
          asOf: ofYear(rows.at(-1)?.anio),
          chart: {
            kind: 'stacked',
            labels: valid.map(r => r.anio),
            series: [
              { name: 'Computadores estudiantes', data: valid.map(r => toNum(r.pc) || 0) },
              { name: 'Tabletas estudiantes', data: valid.map(r => toNum(r.tab_est) || 0) },
              { name: 'Equipos para docentes', data: valid.map(r => (toNum(r.tab_doc) || 0) + (toNum(r.pc_doc) || 0)) },
            ],
          },
          note: `Total acumulado en los años con entregas: ${num(sum(valid, r => (toNum(r.pc) || 0) + (toNum(r.tab_est) || 0) + (toNum(r.tab_doc) || 0) + (toNum(r.pc_doc) || 0)))} terminales entregadas y ${num(sum(valid, r => r.doc))} docentes formados en apropiación TIC.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Aprendices certificados por el SENA en Villeta',
      subtitle: 'Personas certificadas en programas de formación profesional integral por nivel',
      async load({ q }) {
        const rows = await q('sena_certificados', {
          $select: 'periodo, nivel_formacion, sum(gran_total_total_aprendices::number) as m, sum(total_aprendices_femeninos::number) as fem, sum(total_aprendices_masculinos::number) as masc',
          $where: "upper(nombre_municipio_curso) like '%VILLETA%'",
          $group: 'periodo, nivel_formacion',
          $order: 'periodo, m DESC',
        });
        if (!rows.length) return { empty: true };
        const clean = s => String(s || '').replace(/"/g, '').trim();
        const per = clean(rows.at(-1)?.periodo);
        const year = per.slice(0, 4);
        const items = rows.map(r => ({
          nivel: titleCase(clean(r.nivel_formacion)),
          total: toNum(r.m) || 0,
          fem: toNum(r.fem) || 0,
          masc: toNum(r.masc) || 0,
        }));
        return {
          labelTitle: 'Nivel de formación SENA',
          asOf: ofYear(year),
          chart: {
            kind: 'bar',
            labels: items.map(x => x.nivel),
            series: [
              { name: 'Mujeres certificadas', data: items.map(x => x.fem) },
              { name: 'Hombres certificados', data: items.map(x => x.masc) },
            ],
          },
          note: `Periodo reportado: ${per} (${num(sum(items, x => x.total))} aprendices certificados en cursos impartidos en el municipio de Villeta).`,
        };
      },
    },
    { type: 'heading', title: 'Cultura' },
    {
      type: 'chart',
      title: 'Personas atendidas por programas del Ministerio de las Culturas',
      subtitle: 'Total de personas atendidas por vigencia en Villeta',
      async load({ q, M }) {
        const rows = await q('mincultura', { $select: 'vigencia, sum(total_personas_atendidas) as n', $where: `divipola='${M.dane}'`, $group: 'vigencia', $order: 'vigencia' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Vigencia', chart: { kind: 'bar', labels: rows.map(r => r.vigencia), series: [{ name: 'Personas atendidas', data: rows.map(r => toNum(r.n)) }], yoy: true } };
      },
    },
  ],
};
