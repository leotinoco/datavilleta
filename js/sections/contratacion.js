import { num, toNum, cop, change, fecha, titleCase, escapeHtml } from '../format.js';
import { THIS_YEAR, textKey } from './helpers.js';

const ENTIDADES = [
  { value: 'todas', label: 'Todas las entidades con sede en Villeta', re: null, where: '' },
  { value: 'alcaldia', label: 'Alcaldía de Villeta', re: /ALCALD/, where: "upper(nombre_de_la_entidad) like '%ALCALD%'" },
  { value: 'hospital', label: 'E.S.E. Hospital Salazar de Villeta', re: /HOSPITAL/, where: "upper(nombre_de_la_entidad) like '%HOSPITAL%'" },
  { value: 'esp', label: 'Empresa de Servicios Públicos de Villeta', re: /SERVICIOS P.BLICOS/, where: "upper(nombre_de_la_entidad) like '%SERVICIOS P%BLICOS%'" },
  { value: 'instituto', label: 'Instituto Municipal de Turismo, Cultura, Recreación y Deporte', re: /TURISMO/, where: "upper(nombre_de_la_entidad) like '%TURISMO%'" },
  { value: 'concejo', label: 'Concejo Municipal', re: /CONCEJO/, where: "upper(nombre_de_la_entidad) like '%CONCEJO%'" },
  { value: 'personeria', label: 'Personería Municipal', re: /PERSONER/, where: "upper(nombre_de_la_entidad) like '%PERSONER%'" },
  { value: 'educacion', label: 'Instituciones educativas', re: /INSTITUCI.N EDUCATIVA|\bIED\b|INSTITUTO NACIONAL DE PROMOCI/, where: "(upper(nombre_de_la_entidad) like '%INSTITUCI%N EDUCATIVA%' or upper(nombre_de_la_entidad) like '%IED%' or upper(nombre_de_la_entidad) like '%INSTITUTO NACIONAL DE PROMOCI%')" },
  { value: 'sena', label: 'SENA (centro en Villeta)', re: /\bSENA\b/, where: "upper(nombre_de_la_entidad) like '%SENA %'" },
  { value: 'inpec', label: 'Establecimiento penitenciario', re: /PENITENCIARI/, where: "upper(nombre_de_la_entidad) like '%PENITENCIARI%'" },
];
const canon = name => ENTIDADES.slice(1).find(e => e.re.test(String(name).toUpperCase()))?.label || titleCase(name);

// Igualdad exacta (usa índice): un filtro con upper()/like sobre SECOP tarda minutos.
export const secopBase = M => `municipio_entidad in ('${M.nombre}', '${M.nombre.toUpperCase()}')`;
const base = secopBase;
const where = (M, filters, extra) => [base(M), ENTIDADES.find(e => e.value === filters.entidad)?.where, extra].filter(Boolean).join(' and ');

function contratoUrl(v) {
  if (!v) return null;
  if (typeof v === 'object') return v.url || null;
  const m = String(v).match(/https?:\/\/[^\s"']+/);
  return m ? m[0] : null;
}

export default {
  id: 'contratacion',
  title: 'Contratación y finanzas públicas',
  intro: 'Contratos firmados por entidades públicas con sede en Villeta (SECOP I y II), recursos de regalías y la Medición de Desempeño Municipal del DNP. Use el filtro para ver una entidad en particular.',
  filters: [{ id: 'entidad', label: 'Entidad contratante', default: 'todas', options: ENTIDADES.map(({ value, label }) => ({ value, label })) }],
  blocks: [
    {
      type: 'kpis',
      title: 'Contratación del año corrido',
      wide: true,
      async load({ q, M, filters }) {
        const today = new Date();
        const md = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const rows = await q('secop', {
          $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, count(*) as n, sum(valor_contrato) as v',
          $where: where(M, filters, `((fecha_de_firma_del_contrato between '${THIS_YEAR}-01-01' and '${THIS_YEAR}-${md}T23:59:59') or (fecha_de_firma_del_contrato between '${THIS_YEAR - 1}-01-01' and '${THIS_YEAR - 1}-${md}T23:59:59'))`),
          $group: 'y',
        });
        const get = (y, k) => toNum(rows.find(r => Number(r.y) === y)?.[k]) || 0;
        const lbl = `vs mismo periodo ${THIS_YEAR - 1}`;
        return {
          kpis: [
            { label: `Contratos firmados en ${THIS_YEAR} (a la fecha)`, value: num(get(THIS_YEAR, 'n')), delta: change(get(THIS_YEAR, 'n'), get(THIS_YEAR - 1, 'n')), deltaLabel: lbl, source: 'secop' },
            { label: `Valor contratado en ${THIS_YEAR} (a la fecha)`, value: cop(get(THIS_YEAR, 'v')), delta: change(get(THIS_YEAR, 'v'), get(THIS_YEAR - 1, 'v')), deltaLabel: lbl, source: 'secop' },
            { label: `Contratos ${THIS_YEAR - 1} (mismo periodo)`, value: num(get(THIS_YEAR - 1, 'n')), source: 'secop' },
            { label: `Valor ${THIS_YEAR - 1} (mismo periodo)`, value: cop(get(THIS_YEAR - 1, 'v')), source: 'secop' },
          ],
          note: `Periodo comparado: 1 de enero a ${fecha(today)} de cada año, según fecha de firma.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Número de contratos por año',
      subtitle: 'Según fecha de firma',
      async load({ q, M, filters }) {
        const rows = (await q('secop', { $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters), $group: 'y', $order: 'y' })).filter(r => r.y && Number(r.y) <= THIS_YEAR);
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', chart: { kind: 'bar', labels: rows.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y)), series: [{ name: 'Contratos', data: rows.map(r => toNum(r.n)) }], yoy: true, partialLast: Number(rows.at(-1).y) === THIS_YEAR } };
      },
    },
    {
      type: 'chart',
      title: 'Valor contratado por año',
      subtitle: 'Pesos corrientes, según fecha de firma',
      async load({ q, M, filters }) {
        const rows = (await q('secop', { $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters), $group: 'y', $order: 'y' })).filter(r => r.y && Number(r.y) <= THIS_YEAR);
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          chart: { kind: 'bar', format: 'cop', labels: rows.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y)), series: [{ name: 'Valor contratado', data: rows.map(r => toNum(r.v)) }], yoy: true, partialLast: Number(rows.at(-1).y) === THIS_YEAR },
          note: 'Valores tal como los registran las entidades en SECOP; pueden incluir errores de digitación. Los contratos sin fecha de firma no se incluyen en la serie.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Valor contratado por entidad',
      subtitle: `Acumulado ${THIS_YEAR - 4}–${THIS_YEAR}`,
      async load({ q, M, filters }) {
        const rows = await q('secop', { $select: 'nombre_de_la_entidad as e, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters, `fecha_de_firma_del_contrato >= '${THIS_YEAR - 4}-01-01'`), $group: 'e' });
        if (!rows.length) return { empty: true };
        const m = new Map();
        for (const r of rows) m.set(canon(r.e), (m.get(canon(r.e)) || 0) + toNum(r.v));
        const data = [...m.entries()].sort((a, b) => b[1] - a[1]);
        return { labelTitle: 'Entidad', chart: { kind: 'hbar', format: 'cop', labels: data.map(d => d[0]), series: [{ name: 'Valor contratado', data: data.map(d => d[1]) }] } };
      },
    },
    {
      type: 'chart',
      title: 'Contratos por modalidad de selección',
      subtitle: `Número de contratos ${THIS_YEAR - 2}–${THIS_YEAR}`,
      async load({ q, M, filters }) {
        const rows = await q('secop', { $select: 'modalidad_de_contrataci_n as m, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters, `fecha_de_firma_del_contrato >= '${THIS_YEAR - 2}-01-01'`), $group: 'm' });
        if (!rows.length) return { empty: true };
        const m = new Map();
        for (const r of rows) {
          const k = textKey(r.m) || 'sin dato';
          const e = m.get(k) || { label: titleCase(r.m || 'Sin dato'), n: 0, v: 0 };
          e.n += toNum(r.n); e.v += toNum(r.v) || 0;
          m.set(k, e);
        }
        const data = [...m.values()].sort((a, b) => b.n - a.n).slice(0, 12);
        return {
          labelTitle: 'Modalidad',
          chart: { kind: 'hbar', labels: data.map(d => d.label), series: [{ name: 'Contratos', data: data.map(d => d.n) }] },
          table: { columns: [{ key: 'label', label: 'Modalidad' }, { key: 'n', label: 'Contratos', align: 'right', format: v => num(v) }, { key: 'v', label: 'Valor', align: 'right', format: v => cop(v) }], rows: data },
        };
      },
    },
    {
      type: 'table',
      title: 'Contratos más recientes',
      subtitle: 'Últimos 30 contratos firmados',
      wide: true,
      async load({ q, M, filters }) {
        const rows = await q('secop', { $select: 'fecha_de_firma_del_contrato, nombre_de_la_entidad, objeto_del_proceso, objeto_a_contratar, tipo_de_contrato, valor_contrato, url_contrato, origen', $where: where(M, filters, `fecha_de_firma_del_contrato <= '${new Date().toISOString().slice(0, 10)}T23:59:59'`), $order: 'fecha_de_firma_del_contrato DESC', $limit: 30 });
        if (!rows.length) return { empty: true };
        return {
          table: {
            columns: [
              { key: 'fecha_de_firma_del_contrato', label: 'Firma', format: v => fecha(v) },
              { key: 'nombre_de_la_entidad', label: 'Entidad', format: v => canon(v) },
              { key: 'objeto', label: 'Objeto', html: (v, r) => escapeHtml(String(r.objeto_del_proceso || r.objeto_a_contratar || '').slice(0, 180)) },
              { key: 'tipo_de_contrato', label: 'Tipo' },
              { key: 'valor_contrato', label: 'Valor', align: 'right', format: v => cop(toNum(v)) },
              { key: 'url_contrato', label: 'Detalle', html: (v, r) => { const u = contratoUrl(v); return u ? `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(r.origen || 'SECOP')}</a>` : '—'; } },
            ],
            rows,
          },
        };
      },
    },
    { type: 'heading', title: 'Regalías y desempeño de la administración municipal' },
    {
      type: 'table',
      title: 'Sistema General de Regalías: presupuesto y proyectos',
      subtitle: 'Asignaciones del municipio por bienio y fondo',
      wide: true,
      async load({ q, M }) {
        const rows = await q('sgr', { $select: 'vigencia, nombrefondo, presupuestosgrinversion, numeroproyectosaprobados, recursosaprobadosasignadosspgr', $where: `codigodaneentidad='${M.dane}'`, $order: 'vigencia DESC, presupuestosgrinversion DESC' });
        if (!rows.length) return { empty: true };
        return {
          table: {
            columns: [
              { key: 'vigencia', label: 'Vigencia' },
              { key: 'nombrefondo', label: 'Fondo / asignación', format: v => titleCase(v) },
              { key: 'presupuestosgrinversion', label: 'Presupuesto de inversión', align: 'right', format: v => cop(toNum(v)) },
              { key: 'numeroproyectosaprobados', label: 'Proyectos aprobados', align: 'right', format: v => num(toNum(v)) },
              { key: 'recursosaprobadosasignadosspgr', label: 'Recursos aprobados', align: 'right', format: v => cop(toNum(v)) },
            ],
            rows,
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Medición del Desempeño Municipal (MDM)',
      subtitle: 'Puntaje MDM y sus componentes de gestión y resultados (0–100)',
      wide: true,
      async load({ q, M }) {
        const rows = await q('mdm', { $select: 'indicador, anio, dato', $where: `codigo_entidad='${M.dane}' and dato is not null`, $order: 'anio' });
        if (!rows.length) return { empty: true };
        const ind = ['MDM', 'Componente de gestión', 'Componente de resultados'];
        const years = [...new Set(rows.map(r => r.anio))].sort();
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', format: 'dec', beginAtZero: false, labels: years, series: ind.map(i => ({ name: i, data: years.map(y => toNum(rows.find(r => r.anio === y && r.indicador === i)?.dato)) })) },
          note: 'El conjunto abierto del DNP llega hasta la medición publicada en 2022. Resultados posteriores: portal del DNP / TerriData.',
        };
      },
    },
  ],
};
