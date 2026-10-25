import { NAV } from '../nav.js';
import { num, toNum, change, cop, mes, escapeHtml } from '../format.js';
import { THIS_YEAR, corteFecha, ytdWhere, ytdLabel } from './helpers.js';
import { secopBase, corteSecop } from './contratacion.js';
import { ofYear, ofMonth, ofQuarter, ofDate, mesNumero } from '../freshness.js';

const nivelIrca = v => (v <= 5 ? 'Sin riesgo' : v <= 14 ? 'Riesgo bajo' : v <= 35 ? 'Riesgo medio' : v <= 80 ? 'Riesgo alto' : 'Inviable sanitariamente');

// Cada indicador es independiente: si una fuente falla, el resto se muestra igual.
// Todos declaran asOf (periodo del dato) para mostrar si está actualizado.
const TILES = [
  async ({ q, M }) => {
    const [r] = await q('rnt', { $select: 'count(*) as n, sum(camas) as c, max(ano) as ano, max(periodo) as periodo', $where: `cod_mun='${M.dane}' and estado_rnt='ACTIVO'` });
    return { label: 'Prestadores turísticos activos', value: num(toNum(r.n)), hint: `${num(toNum(r.c))} camas registradas`, asOf: ofMonth(r.ano, mesNumero(r.periodo)), source: 'rnt', href: 'turismo/' };
  },
  async ({ q, M }) => {
    const c = await corteFecha(q, 'supertransporte', 'fecha_despacho', `municipio_destino_ruta='${M.dane}'`);
    const rows = await q('supertransporte', { $select: 'date_extract_y(fecha_despacho) as y, sum(pasajeros) as p', $where: `municipio_destino_ruta='${M.dane}' and ${ytdWhere('fecha_despacho', c)}`, $group: 'y' });
    const s = y => toNum(rows.find(r => Number(r.y) === y)?.p) || 0;
    return { label: `Pasajeros hacia Villeta (${ytdLabel(c)} ${c.y})`, value: num(s(c.y)), delta: change(s(c.y), s(c.y - 1)), deltaLabel: `vs mismo periodo ${c.y - 1}`, goodWhen: 'up', asOf: c, source: 'supertransporte', href: 'turismo/' };
  },
  ...[['delito_hurto_personas', 'Hurto a personas'], ['delito_homicidio', 'Homicidios'], ['delito_vif', 'Violencia intrafamiliar']].map(([key, label]) => async ({ q, M }) => {
    const [mx] = await q('delito_hurto_personas', { $select: 'max(fecha_hecho) as m' });
    const d = new Date(mx.m);
    const lastM = d.getDate() >= 28 ? d.getMonth() + 1 : d.getMonth();
    const y = d.getFullYear();
    const rows = await q(key, { $select: 'date_extract_y(fecha_hecho) as y, date_extract_m(fecha_hecho) as m, sum(cantidad) as n', $where: `cod_muni='${M.dane}'`, $group: 'y, m', $order: 'y, m', $limit: 2000 });
    const s = yr => rows.filter(r => Number(r.y) === yr && Number(r.m) <= lastM).reduce((a, r) => a + toNum(r.n), 0);
    return { label: `${label} (ene–${mes(lastM)} ${y})`, value: num(s(y)), delta: change(s(y), s(y - 1)), deltaLabel: `vs ${y - 1}`, goodWhen: 'down', asOf: ofDate(mx.m), source: key, href: 'seguridad/' };
  }),
  async ({ q, M }) => {
    const c = await corteSecop(q, M);
    const rows = await q('secop', {
      $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, sum(valor_contrato) as v',
      $where: `${secopBase(M)} and ${ytdWhere('fecha_de_firma_del_contrato', c)}`,
      $group: 'y',
    });
    const v = y => toNum(rows.find(r => Number(r.y) === y)?.v) || 0;
    return { label: `Valor contratado (${ytdLabel(c)} ${c.y})`, value: cop(v(c.y)), delta: change(v(c.y), v(c.y - 1)), deltaLabel: `vs mismo periodo ${c.y - 1}`, asOf: c, source: 'secop', href: 'contratacion/' };
  },
  async ({ q }) => {
    const rows = await q('sfc_captaciones', { $select: 'fecha_de_corte as f, sum(cartera_de_cr_ditos) as c', $where: "nombre_del_municipio='VILLETA'", $group: 'f', $order: 'f DESC', $limit: 6 });
    const d = new Date(rows[0].f);
    const prev = rows.find(r => { const p = new Date(r.f); return p.getFullYear() === d.getFullYear() - 1 && p.getMonth() === d.getMonth(); });
    return { label: 'Cartera de créditos', value: cop(toNum(rows[0].c)), delta: prev ? change(toNum(rows[0].c), toNum(prev.c)) : null, deltaLabel: 'vs mismo trimestre año anterior', asOf: ofQuarter(d.getFullYear(), Math.ceil((d.getMonth() + 1) / 3)), source: 'sfc_captaciones', href: 'economia/' };
  },
  async ({ q, M }) => {
    const [r] = await q('ins_irca', { $select: 'a_o, irca', $where: `municipiocodigo='${M.dane}'`, $order: 'a_o DESC', $limit: 1 });
    const v = toNum(r.irca);
    return { label: 'Calidad del agua (IRCA)', value: num(v, 1), hint: `${nivelIrca(v)} (0 = mejor)`, asOf: ofYear(r.a_o), source: 'ins_irca', href: 'servicios/' };
  },
  async ({ q, M }) => {
    const rows = await q('men', { $select: 'a_o, cobertura_neta, deserci_n', $where: `c_digo_municipio='${M.dane}'`, $order: 'a_o DESC', $limit: 2 });
    return { label: 'Cobertura educativa neta', value: `${num(toNum(rows[0].cobertura_neta), 1)} %`, hint: `Deserción: ${num(toNum(rows[0].deserci_n), 1)} %`, delta: rows[1] ? change(toNum(rows[0].cobertura_neta), toNum(rows[1].cobertura_neta)) : null, deltaLabel: `vs ${rows[1]?.a_o}`, goodWhen: 'up', asOf: ofYear(rows[0].a_o), source: 'men', href: 'educacion/' };
  },
  async ({ q, M }) => {
    const rows = await q('finagro', { $select: 'date_extract_y(fecha_credito) as y, sum(valor_credito) as v', $where: `cod_municipio=${M.dane}`, $group: 'y', $order: 'y DESC', $limit: 3 });
    const full = rows.filter(r => Number(r.y) < THIS_YEAR);
    return { label: `Crédito agropecuario FINAGRO (año ${full[0].y})`, value: cop(toNum(full[0].v)), delta: full[1] ? change(toNum(full[0].v), toNum(full[1].v)) : null, deltaLabel: `vs ${full[1]?.y}`, goodWhen: 'up', asOf: ofYear(full[0].y), source: 'finagro', href: 'agro/' };
  },
];

export default {
  id: 'inicio',
  eyebrow: 'Observatorio de datos públicos',
  title: 'Villeta, Cundinamarca en datos',
  intro: 'Información oficial sobre Villeta consultada en vivo en las APIs del Estado colombiano (datos.gov.co): ministerios, superintendencias, Policía, ICFES, DNP, Cámara de Comercio y otras entidades. Cada gráfico cita su fuente, la fecha de actualización y la consulta exacta a la API.',
  blocks: [
    {
      type: 'kpis',
      title: 'Indicadores clave',
      subtitle: 'Último dato disponible en cada fuente y su variación frente al periodo comparable anterior',
      wide: true,
      async load(ctx) {
        return {
          asOf: false,
          kpis: TILES.map(t => t(ctx)),
          note: 'Cada indicador muestra el periodo de su último dato y si está actualizado, con rezago o desactualizado (pase el cursor para ver el criterio). ▲▼ indican la dirección del cambio; en verde cuando la variación es favorable y en rojo cuando es desfavorable. Haga clic en un indicador para ir a su sección. Si una fuente no responde, su indicador se omite.',
        };
      },
    },
    {
      type: 'html',
      wide: true,
      html: `<h2 class="nav-title">Secciones</h2><div class="nav-grid">${NAV.filter(n => n.id !== 'inicio').map(n => `<a class="nav-card" href="${n.id}/"><strong>${escapeHtml(n.label)}</strong><span>${escapeHtml(n.desc)}</span></a>`).join('')}</div>`,
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="ficha"><h2>Ficha del municipio</h2><dl>
        <div><dt>Código DANE</dt><dd>25875</dd></div>
        <div><dt>Departamento</dt><dd>Cundinamarca</dd></div>
        <div><dt>Provincia</dt><dd>Gualivá</dd></div>
        <div><dt>Cámara de Comercio</dt><dd>Facatativá (código RUES 47)</dd></div>
        <div><dt>Gestor catastral</dt><dd>Agencia Catastral de Cundinamarca</dd></div>
        <div><dt>Prestador de acueducto, alcantarillado y aseo</dt><dd>Empresa de Servicios Públicos E.S.P. de Villeta</dd></div>
      </dl></div>`,
    },
  ],
};
