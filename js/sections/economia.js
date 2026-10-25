import { num, toNum, change, cop, mes, fecha, titleCase, periodo } from '../format.js';
import { annual, THIS_YEAR, topN, corteFecha } from './helpers.js';
import { ofYear, ofMonth, ofQuarter } from '../freshness.js';

const corteRues = (q, M, key = 'rues') => corteFecha(q, key, 'fecha_matricula', `codigo_camara='${M.codigoCamaraRues}'`);
const trimestre = f => { const d = new Date(f); return ofQuarter(d.getFullYear(), Math.ceil((d.getMonth() + 1) / 3)); };

const CIIU_SECCIONES = [
  [1, 3, 'A · Agro, silvicultura y pesca'], [5, 9, 'B · Minas y canteras'], [10, 33, 'C · Industria manufacturera'],
  [35, 35, 'D · Energía y gas'], [36, 39, 'E · Agua y residuos'], [41, 43, 'F · Construcción'],
  [45, 47, 'G · Comercio y reparación de vehículos'], [49, 53, 'H · Transporte y almacenamiento'],
  [55, 56, 'I · Alojamiento y servicios de comida'], [58, 63, 'J · Información y comunicaciones'],
  [64, 66, 'K · Financieras y de seguros'], [68, 68, 'L · Inmobiliarias'], [69, 75, 'M · Profesionales y técnicas'],
  [77, 82, 'N · Servicios administrativos y de apoyo'], [84, 84, 'O · Administración pública'], [85, 85, 'P · Educación'],
  [86, 88, 'Q · Salud y asistencia social'], [90, 93, 'R · Arte, entretenimiento y recreación'],
  [94, 96, 'S · Otros servicios'], [97, 98, 'T · Hogares empleadores'], [99, 99, 'U · Organizaciones extraterritoriales'],
];
const seccionCiiu = code => {
  const d = Number(String(code ?? '').padStart(4, '0').slice(0, 2));
  return CIIU_SECCIONES.find(([a, b]) => d >= a && d <= b)?.[2] || 'Sin clasificar';
};

const ORG_CORTO = [
  [/PERSONA NATURAL/, 'Persona natural'], [/ACCIONES SIMPLIFICADAS/, 'S.A.S.'], [/LIMITADA/, 'Sociedad limitada'],
  [/ANONIMA|ANÓNIMA/, 'Sociedad anónima'], [/COOPERATIV/, 'Cooperativas y economía solidaria'],
  [/FUNDACION|FUNDACIÓN|ASOCIACION|ASOCIACIÓN|CORPORACION|CORPORACIÓN/, 'Asociaciones, fundaciones y corporaciones'],
  [/UNIPERSONAL/, 'Empresa unipersonal'], [/ASOCIATIVAS DE TRABAJO/, 'Empresa asociativa de trabajo'],
];
const orgCorta = s => ORG_CORTO.find(([re]) => re.test(String(s).toUpperCase()))?.[1] || titleCase(s);

const RUES_SCOPE = { nivel: 'Dato regional, no solo Villeta', texto: 'cubre toda la jurisdicción de la Cámara de Comercio de Facatativá (Villeta y otros municipios de Sabana Occidente, Gualivá y Tequendama). El registro abierto no trae el municipio de cada empresa.' };

export default {
  id: 'economia',
  title: 'Economía, empresas y sistema financiero',
  intro: 'Dinámica empresarial en la jurisdicción de la Cámara de Comercio de Facatativá (a la que pertenece Villeta), crédito y depósitos del sistema financiero en el municipio, y empresas vigiladas por las Superintendencias.',
  blocks: [
    { type: 'heading', title: 'Registro mercantil – Cámara de Comercio de Facatativá', text: 'Fuente: RUES (Confecámaras). <strong>Importante:</strong> el conjunto abierto no desagrega por municipio, por lo que las cifras corresponden a toda la jurisdicción de la Cámara de Comercio de Facatativá, que incluye a Villeta y otros municipios de Sabana Occidente, Gualivá y Tequendama.' },
    {
      type: 'chart',
      title: 'Matrículas nuevas y cancelaciones por año',
      subtitle: 'Personas naturales, sociedades y ESAL – jurisdicción CC Facatativá',
      scope: RUES_SCOPE,
      wide: true,
      async load({ q, M }) {
        const where = f => `codigo_camara='${M.codigoCamaraRues}' and ${f} >= '2010'`;
        const [alta, baja] = await Promise.all([
          q('rues', { $select: 'substring(fecha_matricula,1,4) as y, count(*) as n', $where: where('fecha_matricula'), $group: 'y', $order: 'y' }),
          q('rues', { $select: 'substring(fecha_cancelacion,1,4) as y, count(*) as n', $where: where('fecha_cancelacion'), $group: 'y', $order: 'y' }),
        ]);
        const a = annual(alta, { from: 2010 });
        const b = annual(baja, { from: 2010 });
        const partial = a.years.at(-1) === THIS_YEAR;
        const labels = a.labels.map(l => (Number(l) === THIS_YEAR ? `${l}*` : l));
        return {
          labelTitle: 'Año',
          asOf: await corteRues(q, M),
          chart: { kind: 'bar', labels, series: [{ name: 'Matrículas nuevas', data: a.data }, { name: 'Cancelaciones', data: a.years.map(y => b.data[b.years.indexOf(y)] ?? 0) }], yoy: true, partialLast: partial },
          note: 'Los picos de cancelaciones (p. ej. 2011 y 2015) suelen coincidir con depuraciones masivas del registro ordenadas por ley (matrículas sin renovar). * Año en curso.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Nuevos establecimientos de comercio por año',
      subtitle: 'Establecimientos, agencias y sucursales matriculados – jurisdicción CC Facatativá',
      scope: RUES_SCOPE,
      async load({ q, M }) {
        const rows = await q('rues_estab', { $select: 'substring(fecha_matricula,1,4) as y, count(*) as n', $where: `codigo_camara='${M.codigoCamaraRues}' and fecha_matricula >= '2010'`, $group: 'y', $order: 'y' });
        const s = annual(rows, { from: 2010 });
        if (!s.labels.length) return { empty: true };
        const partial = s.years.at(-1) === THIS_YEAR;
        return {
          labelTitle: 'Año',
          asOf: await corteRues(q, M, 'rues_estab'),
          chart: { kind: 'bar', labels: s.labels.map(l => (Number(l) === THIS_YEAR ? `${l}*` : l)), series: [{ name: 'Establecimientos nuevos', data: s.data }], yoy: true, partialLast: partial },
        };
      },
    },
    {
      type: 'chart',
      title: 'Registros activos por actividad económica',
      subtitle: 'Sección CIIU de la actividad principal – jurisdicción CC Facatativá',
      scope: RUES_SCOPE,
      async load({ q, M }) {
        const rows = await q('rues', { $select: 'cod_ciiu_act_econ_pri as c, count(*) as n', $where: `codigo_camara='${M.codigoCamaraRues}' and estado_matricula='ACTIVA'`, $group: 'c', $limit: 5000 });
        const m = new Map();
        for (const r of rows) m.set(seccionCiiu(r.c), (m.get(seccionCiiu(r.c)) || 0) + toNum(r.n));
        const data = [...m.entries()].sort((a, b) => b[1] - a[1]);
        return {
          labelTitle: 'Sección CIIU',
          asOf: await corteRues(q, M),
          chart: { kind: 'hbar', labels: data.map(d => d[0]), series: [{ name: 'Registros activos', data: data.map(d => d[1]) }] },
        };
      },
    },
    {
      type: 'chart',
      title: 'Registros activos por organización jurídica',
      subtitle: 'Jurisdicción CC Facatativá',
      scope: RUES_SCOPE,
      async load({ q, M }) {
        const rows = await q('rues', { $select: 'organizacion_juridica as o, count(*) as n', $where: `codigo_camara='${M.codigoCamaraRues}' and estado_matricula='ACTIVA'`, $group: 'o' });
        const m = new Map();
        for (const r of rows) m.set(orgCorta(r.o), (m.get(orgCorta(r.o)) || 0) + toNum(r.n));
        const data = topN(m.entries(), 7, 'Otras formas');
        return {
          labelTitle: 'Organización jurídica',
          asOf: await corteRues(q, M),
          chart: { kind: 'hbar', labels: data.map(d => d[0]), series: [{ name: 'Registros activos', data: data.map(d => d[1]) }] },
        };
      },
    },

    { type: 'heading', title: 'Sistema financiero en Villeta', text: 'Saldos reportados por los establecimientos de crédito a la Superintendencia Financiera para oficinas ubicadas en el municipio.' },
    {
      type: 'kpis',
      title: 'Crédito y depósitos – último corte',
      wide: true,
      async load({ q }) {
        const rows = await q('sfc_captaciones', {
          $select: 'fecha_de_corte as f, sum(cartera_de_cr_ditos) as cart, sum(dep_sitos_de_ahorro) as aho, sum(certificados_de_dep_sito) as cdt, sum(dep_sitos_en_cuenta_corriente) as cte',
          $where: "nombre_del_municipio='VILLETA'", $group: 'f', $order: 'f DESC', $limit: 8,
        });
        if (!rows.length) return { empty: true };
        const last = rows[0];
        const d = new Date(last.f);
        const prev = rows.find(r => { const p = new Date(r.f); return p.getFullYear() === d.getFullYear() - 1 && p.getMonth() === d.getMonth(); });
        const dep = r => toNum(r.aho) + toNum(r.cdt) + toNum(r.cte);
        const lbl = prev ? `vs ${mes(d.getMonth() + 1)} ${d.getFullYear() - 1}` : '';
        return {
          asOf: trimestre(last.f),
          kpis: [
            { label: 'Cartera de créditos', value: cop(toNum(last.cart)), delta: prev ? change(toNum(last.cart), toNum(prev.cart)) : null, deltaLabel: lbl, hint: `Corte ${fecha(last.f)}`, source: 'sfc_captaciones' },
            { label: 'Depósitos (ahorro + CDT + corriente)', value: cop(dep(last)), delta: prev ? change(dep(last), dep(prev)) : null, deltaLabel: lbl, hint: `Corte ${fecha(last.f)}`, source: 'sfc_captaciones' },
            { label: 'Depósitos de ahorro', value: cop(toNum(last.aho)), delta: prev ? change(toNum(last.aho), toNum(prev.aho)) : null, deltaLabel: lbl, source: 'sfc_captaciones' },
            { label: 'CDT', value: cop(toNum(last.cdt)), delta: prev ? change(toNum(last.cdt), toNum(prev.cdt)) : null, deltaLabel: lbl, source: 'sfc_captaciones' },
          ],
        };
      },
    },
    {
      type: 'chart',
      title: 'Cartera de créditos y depósitos',
      subtitle: 'Saldos en pesos corrientes por fecha de corte (trimestral)',
      wide: true,
      async load({ q }) {
        const rows = await q('sfc_captaciones', {
          $select: 'fecha_de_corte as f, sum(cartera_de_cr_ditos) as cart, sum(dep_sitos_de_ahorro) as aho, sum(certificados_de_dep_sito) as cdt, sum(dep_sitos_en_cuenta_corriente) as cte',
          $where: "nombre_del_municipio='VILLETA'", $group: 'f', $order: 'f', $limit: 500,
        });
        if (!rows.length) return { empty: true };
        const labels = rows.map(r => { const d = new Date(r.f); return `${mes(d.getMonth() + 1)} ${d.getFullYear()}`; });
        return {
          labelTitle: 'Corte',
          asOf: trimestre(rows.at(-1).f),
          chart: {
            kind: 'line', format: 'cop', labels, timeline: rows.map(r => periodo(r.f)),
            series: [
              { name: 'Cartera de créditos', data: rows.map(r => toNum(r.cart)) },
              { name: 'Depósitos (ahorro + CDT + corriente)', data: rows.map(r => toNum(r.aho) + toNum(r.cdt) + toNum(r.cte)) },
            ],
          },
          note: 'Valores nominales (sin ajustar por inflación). El conjunto registra a Villeta con código de departamento 11; se filtra por nombre del municipio.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Puntos de atención financiera',
      subtitle: 'Total de puntos reportados (oficinas, corresponsales, cajeros y otros canales) por mes',
      async load({ q, M }) {
        const rows = await q('sfc_puntos', { $select: 'fecha_corte as f, sum(cantidad_puntos_atencion) as n', $where: `codigo_municipio=${M.dane}`, $group: 'f', $order: 'f' });
        if (!rows.length) return { empty: true };
        const ult = new Date(rows.at(-1).f);
        return {
          labelTitle: 'Corte',
          asOf: ofMonth(ult.getFullYear(), ult.getMonth() + 1),
          chart: { kind: 'line', timeline: rows.map(r => periodo(r.f)), labels: rows.map(r => { const d = new Date(r.f); return `${mes(d.getMonth() + 1)} ${d.getFullYear()}`; }), series: [{ name: 'Puntos de atención', data: rows.map(r => toNum(r.n)) }] },
        };
      },
    },
    {
      type: 'chart',
      title: 'Puntos de atención por entidad financiera',
      subtitle: 'Último corte disponible',
      async load({ q, M }) {
        const [last] = await q('sfc_puntos', { $select: 'max(fecha_corte) as f', $where: `codigo_municipio=${M.dane}` });
        if (!last?.f) return { empty: true };
        const rows = await q('sfc_puntos', { $select: 'nombre_entidad as e, sum(cantidad_puntos_atencion) as n', $where: `codigo_municipio=${M.dane} and fecha_corte='${last.f.slice(0, 19)}'`, $group: 'e', $order: 'n DESC' });
        const data = topN(rows.map(r => [titleCase(r.e), toNum(r.n)]), 12, 'Otras entidades');
        const ult = new Date(last.f);
        return {
          labelTitle: 'Entidad',
          asOf: ofMonth(ult.getFullYear(), ult.getMonth() + 1),
          chart: { kind: 'hbar', labels: data.map(d => d[0]), series: [{ name: 'Puntos de atención', data: data.map(d => d[1]) }] },
          note: `Corte: ${fecha(last.f)}.`,
        };
      },
    },

    { type: 'heading', title: 'Empresas y entidades vigiladas con domicilio en Villeta' },
    {
      type: 'table',
      title: 'Empresas de Villeta entre las 10.000 más grandes del país',
      subtitle: 'Ranking de la Superintendencia de Sociedades por año de corte',
      wide: true,
      async load({ q, M }) {
        const rows = await q('supersociedades', { $select: 'raz_n_social, supervisor, macrosector, a_o_de_corte, ingresos_operacionales, ganancia_p_rdida, total_activos, total_patrimonio', $where: `upper(ciudad_domicilio)='${M.nombre.toUpperCase()}'`, $order: 'a_o_de_corte DESC' });
        if (!rows.length) return { empty: true };
        return {
          asOf: ofYear(Math.max(...rows.map(r => parseInt(r.a_o_de_corte, 10)))),
          table: {
            columns: [
              { key: 'raz_n_social', label: 'Razón social' },
              { key: 'a_o_de_corte', label: 'Año', format: v => num(toNum(v)) },
              { key: 'supervisor', label: 'Supervisor' },
              { key: 'macrosector', label: 'Macrosector', format: v => titleCase(v) },
              { key: 'ingresos_operacionales', label: 'Ingresos operacionales', align: 'right' },
              { key: 'ganancia_p_rdida', label: 'Ganancia (pérdida)', align: 'right' },
              { key: 'total_activos', label: 'Activos', align: 'right' },
              { key: 'total_patrimonio', label: 'Patrimonio', align: 'right' },
            ],
            rows,
          },
          note: 'Cifras financieras tal como las publica la fuente (expresadas en billones de pesos).',
        };
      },
    },
    {
      type: 'table',
      title: 'Entidades del sector solidario',
      subtitle: 'Cooperativas y entidades vigiladas por Supersolidaria',
      async load({ q, M }) {
        const rows = await q('supersolidaria', { $select: 'nombreentidad, nombretipo, nombreactividad, a_o', $where: `upper(municipio) like '%${M.nombre.toUpperCase()}%'`, $order: 'nombreentidad' });
        if (!rows.length) return { empty: true };
        return {
          asOf: ofYear(Math.max(...rows.map(r => Number(r.a_o)))),
          table: {
            columns: [
              { key: 'nombreentidad', label: 'Entidad', format: v => titleCase(v) },
              { key: 'nombretipo', label: 'Tipo' },
              { key: 'nombreactividad', label: 'Actividad' },
              { key: 'a_o', label: 'Último reporte', align: 'right' },
            ],
            rows,
          },
        };
      },
    },
  ],
};
