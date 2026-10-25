import { num, toNum, cop, change, fecha, titleCase, escapeHtml } from '../format.js';
import { THIS_YEAR, corteFecha } from './helpers.js';
import { ofYear } from '../freshness.js';

// Último contrato firmado (sin fechas futuras mal digitadas) = fecha de corte de SECOP para Villeta.
const hoy = () => new Date().toISOString().slice(0, 10);
export const corteSecop = (q, M) => corteFecha(q, 'secop', 'fecha_de_firma_del_contrato', `${secopBase(M)} and fecha_de_firma_del_contrato <= '${hoy()}T23:59:59'`);

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
// Las entidades no listadas se agrupan: SECOP trae algún registro con nombre de persona natural como "entidad".
const canon = name => ENTIDADES.slice(1).find(e => e.re.test(String(name).toUpperCase()))?.label || 'Otras entidades';

// Modalidades y tipos de contrato agrupados (SECOP I y II escriben el mismo concepto de varias formas).
const MODALIDADES = [
  ['Contratación directa', /DIRECTA/],
  ['Régimen especial', /R.GIMEN ESPECIAL/],
  ['Mínima cuantía', /M.NIMA CUANT/],
  ['Selección abreviada y subasta', /ABREVIADA|SUBASTA/],
  ['Licitación pública', /LICITACI/],
  ['Concurso de méritos', /CONCURSO/],
  ['Otras modalidades', /./],
];
const TIPOS_CONTRATO = [
  ['Prestación de servicios', /PRESTACI.N DE SERVICIOS/],
  ['Suministro', /SUMINISTRO/],
  ['Obra', /^OBRA/],
  ['Compraventa', /COMPRAVENTA|VENTA MUEBLES/],
  ['Consultoría e interventoría', /CONSULTOR|INTERVENTOR/],
  ['Arrendamiento y comodato', /ARRENDAMIENTO|COMODATO/],
  ['Otros tipos', /./],
];
const grupoDe = (lista, v) => lista.find(([, re]) => re.test(String(v || '').toUpperCase()))?.[0] ?? lista.at(-1)[0];
const anioLabel = y => (Number(y) === THIS_YEAR ? `${y}*` : String(y));

// Serie por año y grupo: { anios, grupos (ordenados por valor total), n[grupo][i], v[grupo][i] }.
function porAnioYGrupo(rows, grupo, orden) {
  const anios = [...new Set(rows.map(r => Number(r.y)))].filter(y => y && y <= THIS_YEAR).sort((a, b) => a - b);
  const acc = new Map();
  for (const r of rows) {
    const i = anios.indexOf(Number(r.y));
    if (i < 0) continue;
    const g = grupo(r.g);
    if (!acc.has(g)) acc.set(g, { n: anios.map(() => 0), v: anios.map(() => 0) });
    acc.get(g).n[i] += toNum(r.n) || 0;
    acc.get(g).v[i] += toNum(r.v) || 0;
  }
  const total = g => acc.get(g)[orden].reduce((a, b) => a + b, 0);
  // Máximo 8 series (paleta categórica): las menores se suman al grupo "Otras…".
  const otras = [...acc.keys()].find(g => /^Otr/.test(g)) || 'Otras';
  const ordenados = [...acc.keys()].filter(g => g !== otras).sort((a, b) => total(b) - total(a));
  for (const g of ordenados.slice(7)) {
    if (!acc.has(otras)) acc.set(otras, { n: anios.map(() => 0), v: anios.map(() => 0) });
    acc.get(g).n.forEach((x, i) => { acc.get(otras).n[i] += x; });
    acc.get(g).v.forEach((x, i) => { acc.get(otras).v[i] += x; });
    acc.delete(g);
  }
  const grupos = [...ordenados.slice(0, 7), ...(acc.has(otras) ? [otras] : [])];
  return { anios, grupos, n: Object.fromEntries(grupos.map(g => [g, acc.get(g).n])), v: Object.fromEntries(grupos.map(g => [g, acc.get(g).v])) };
}
const tablaAnioGrupo = (s, etiqueta) => ({
  columns: [
    { key: 'y', label: 'Año' },
    { key: 'g', label: etiqueta },
    { key: 'n', label: 'Contratos', align: 'right', format: v => num(v) },
    { key: 'v', label: 'Valor', align: 'right', format: v => cop(v) },
  ],
  rows: s.anios.flatMap((y, i) => s.grupos.map(g => ({ y: anioLabel(y), g, n: s.n[g][i], v: s.v[g][i] })).filter(r => r.n)).reverse(),
});

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
    { type: 'heading', title: 'Contratos públicos (SECOP)', text: 'Contratos firmados por las entidades con sede en Villeta, según SECOP I y II.' },
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
          asOf: await corteSecop(q, M),
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
        return { labelTitle: 'Año', asOf: await corteSecop(q, M), chart: { kind: 'bar', labels: rows.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y)), series: [{ name: 'Contratos', data: rows.map(r => toNum(r.n)) }], yoy: true, partialLast: Number(rows.at(-1).y) === THIS_YEAR } };
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
          asOf: await corteSecop(q, M),
          chart: { kind: 'bar', format: 'cop', labels: rows.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y)), series: [{ name: 'Valor contratado', data: rows.map(r => toNum(r.v)) }], yoy: true, partialLast: Number(rows.at(-1).y) === THIS_YEAR },
          note: 'Valores tal como los registran las entidades en SECOP; pueden incluir errores de digitación. Los contratos sin fecha de firma no se incluyen en la serie.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Valor contratado por entidad y año',
      subtitle: 'Pesos corrientes, según fecha de firma',
      wide: true,
      async load({ q, M, filters }) {
        const rows = await q('secop', { $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, nombre_de_la_entidad as g, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters), $group: 'y, g', $limit: 5000 });
        if (!rows.length) return { empty: true };
        const s = porAnioYGrupo(rows, canon, 'v');
        const total = i => s.grupos.reduce((t, g) => t + s.v[g][i], 0);
        const ult = s.anios.at(-1) === THIS_YEAR ? s.anios.length - 2 : s.anios.length - 1;
        const lider = s.grupos.map(g => [g, s.v[g][ult]]).sort((a, b) => b[1] - a[1])[0];
        return {
          labelTitle: 'Año',
          asOf: await corteSecop(q, M),
          chart: { kind: 'stacked', format: 'cop', labels: s.anios.map(anioLabel), series: s.grupos.map(g => ({ name: g, data: s.v[g], muted: g === 'Otras entidades' })), partialLast: s.anios.at(-1) === THIS_YEAR, footer: i => `Total del año: ${cop(total(i))}${i > 0 ? ` (${total(i - 1) ? `${total(i) >= total(i - 1) ? '+' : ''}${num(change(total(i), total(i - 1)), 0)} %` : '—'} vs ${s.anios[i - 1]})` : ''}` },
          table: tablaAnioGrupo(s, 'Entidad'),
          note: `En ${s.anios[ult]}, último año completo, la entidad que más contrató fue ${lider[0]} (${cop(lider[1])} de ${cop(total(ult))}). Los años anteriores a 2014 están incompletos porque varias entidades no publicaban en SECOP. * Año en curso (barra más clara).`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Contratos por modalidad de selección y año',
      subtitle: 'Número de contratos firmados en cada año, por modalidad',
      wide: true,
      async load({ q, M, filters }) {
        const rows = await q('secop', { $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, modalidad_de_contrataci_n as g, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters), $group: 'y, g', $limit: 5000 });
        if (!rows.length) return { empty: true };
        const s = porAnioYGrupo(rows, v => grupoDe(MODALIDADES, v), 'n');
        const ult = s.anios.at(-1) === THIS_YEAR ? s.anios.length - 2 : s.anios.length - 1;
        const sum = (k, i, gs = s.grupos) => gs.reduce((t, g) => t + s[k][g][i], 0);
        const sinCompetencia = s.grupos.filter(g => g === 'Contratación directa' || g === 'Régimen especial');
        const shareN = (sum('n', ult, sinCompetencia) / sum('n', ult)) * 100;
        const shareV = (sum('v', ult, sinCompetencia) / sum('v', ult)) * 100;
        return {
          labelTitle: 'Año',
          asOf: await corteSecop(q, M),
          chart: { kind: 'stacked', labels: s.anios.map(anioLabel), series: s.grupos.map(g => ({ name: g, data: s.n[g], muted: g === 'Otras modalidades' })), partialLast: s.anios.at(-1) === THIS_YEAR, footer: i => `Total: ${num(sum('n', i))} contratos por ${cop(sum('v', i))}` },
          table: tablaAnioGrupo(s, 'Modalidad'),
          note: `En ${s.anios[ult]}, el ${num(shareN, 0)} % de los contratos (${num(shareV, 0)} % del valor) se adjudicó sin concurso de varios oferentes: contratación directa o régimen especial. El régimen especial lo usan sobre todo el Hospital, la ESP y los colegios, que no contratan por la Ley 80. Use "Ver tabla" para el valor por modalidad y año. * Año en curso.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Contratos por tipo y año',
      subtitle: 'Número de contratos firmados en cada año, por tipo de contrato',
      wide: true,
      async load({ q, M, filters }) {
        const rows = await q('secop', { $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, tipo_de_contrato as g, count(*) as n, sum(valor_contrato) as v', $where: where(M, filters), $group: 'y, g', $limit: 5000 });
        if (!rows.length) return { empty: true };
        const s = porAnioYGrupo(rows, v => grupoDe(TIPOS_CONTRATO, v), 'n');
        const ult = s.anios.at(-1) === THIS_YEAR ? s.anios.length - 2 : s.anios.length - 1;
        const tot = (k, i) => s.grupos.reduce((t, g) => t + s[k][g][i], 0);
        const ps = 'Prestación de servicios';
        const obra = 'Obra';
        return {
          labelTitle: 'Año',
          asOf: await corteSecop(q, M),
          chart: { kind: 'stacked', labels: s.anios.map(anioLabel), series: s.grupos.map(g => ({ name: g, data: s.n[g], muted: g === 'Otros tipos' })), partialLast: s.anios.at(-1) === THIS_YEAR, footer: i => `Total: ${num(tot('n', i))} contratos por ${cop(tot('v', i))}` },
          table: tablaAnioGrupo(s, 'Tipo de contrato'),
          note: `En ${s.anios[ult]}, ${num(s.n[ps]?.[ult] || 0)} de ${num(tot('n', ult))} contratos fueron de prestación de servicios (${num(((s.n[ps]?.[ult] || 0) / tot('n', ult)) * 100, 0)} %), por ${cop(s.v[ps]?.[ult] || 0)}; los de obra fueron ${num(s.n[obra]?.[ult] || 0)} por ${cop(s.v[obra]?.[ult] || 0)}. Use "Ver tabla" para el valor por tipo y año. * Año en curso.`,
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
          asOf: await corteSecop(q, M),
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
        const anios = rows.flatMap(r => String(r.vigencia).match(/\d{4}/g) || []).map(Number);
        return {
          asOf: anios.length ? ofYear(Math.max(...anios)) : undefined,
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
