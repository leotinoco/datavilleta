import { NAV } from '../nav.js';
import { num, pct, toNum, change, cop, mes, escapeHtml } from '../format.js';
import { THIS_YEAR, corteFecha, ytdWhere, ytdLabel, sum } from './helpers.js';
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
  async ({ q }) => {
    const rows = await q('ani_peajes', { $select: 'date_extract_y(desde) as y, sum(cantidadtrafico::number) as t', $where: "upper(peaje)='CAIQUERO'", $group: 'y', $order: 'y DESC', $limit: 3 });
    const full = rows.filter(r => Number(r.y) < THIS_YEAR);
    return { label: `Tráfico Peaje Caiquero (año ${full[0].y})`, value: num(toNum(full[0].t)), delta: full[1] ? change(toNum(full[0].t), toNum(full[1].t)) : null, deltaLabel: `vs ${full[1]?.y}`, goodWhen: 'up', hint: 'Corredor vial Dindal–Villeta', asOf: ofYear(full[0].y), source: 'ani_peajes', href: 'turismo/' };
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
    const rows = await q('sisben', { $select: 'grupo, corte, sum(fex::number) as pob', $where: `cod_mpio='${M.dane}'`, $group: 'grupo, corte' });
    const tot = Math.round(sum(rows, r => r.pob));
    const ab = Math.round(sum(rows.filter(r => r.grupo === 'A' || r.grupo === 'B'), r => r.pob));
    return { label: 'Pobreza en Sisbén IV (Grupos A y B)', value: pct((ab / (tot || 1)) * 100, 1), hint: `${num(ab)} de ${num(tot)} personas categorizadas`, asOf: ofYear(rows[0]?.corte?.replace('SIV_', '')), source: 'sisben', href: 'social/' };
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
  eyebrow: 'Observatorio territorial de datos públicos · Código DANE 25875',
  title: 'Villeta, Cundinamarca en datos',
  intro: 'Plataforma abierta de consulta y verificación de estadísticas públicas de Villeta (Cundinamarca). Conecta en tiempo real con más de 65 conjuntos oficiales del Estado colombiano en datos.gov.co —ministerios, superintendencias, DNP, Policía Nacional, Medicina Legal, ADRES, INS, ICFES, UPRA, CAR, IDEAM y SECOP— e integra informes técnicos de servicios públicos para uso de periodistas, servidores públicos, concejales, veedurías y ciudadanía.',
  blocks: [
    {
      type: 'kpis',
      title: 'Indicadores clave del municipio',
      subtitle: 'Último dato disponible en cada fuente oficial y su variación frente al periodo comparable anterior',
      wide: true,
      async load(ctx) {
        return {
          asOf: false,
          kpis: TILES.map(t => t(ctx)),
          note: 'Cada indicador muestra el periodo de su último dato y si está actualizado, con rezago o desactualizado (pase el cursor para ver el criterio). ▲▼ indican la dirección del cambio; en verde cuando la variación es favorable y en rojo cuando es desfavorable. Haga clic en cualquier indicador para abrir su sección detallada.',
        };
      },
    },
    {
      type: 'html',
      wide: true,
      html: `<h2 class="nav-title">Áreas temáticas del observatorio</h2><div class="nav-grid">${NAV.filter(n => n.id !== 'inicio').map(n => `<a class="nav-card" href="${n.id}/"><strong>${escapeHtml(n.label)}</strong><span>${escapeHtml(n.desc)}</span></a>`).join('')}</div>`,
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="press-guide">
        <h2>Guía rápida para periodistas, investigadores y servidores públicos</h2>
        <div class="press-grid">
          <div>
            <strong>1. Trazabilidad y auditoría en un clic</strong>
            <p>Ninguna cifra es una "caja negra". Al pie de cada gráfico encontrará el enlace directo al conjunto oficial en <code>datos.gov.co</code> y el desplegable <em>Consulta API</em> con la sentencia SoQL exacta que genera los datos.</p>
          </div>
          <div>
            <strong>2. Descarga de datos, tablas y citación</strong>
            <p>Todas las tarjetas cuentan con los botones <em>Ver tabla</em>, <em>Descargar CSV</em> (compatible con Excel en español) y <em>Copiar cita</em> para incorporar la fuente técnica en informes oficiales, derechos de petición o notas de prensa.</p>
          </div>
          <div>
            <strong>3. Semáforo de vigencia y alcance territorial</strong>
            <p>El distintivo superior derecho indica el corte real del dato (<em>✓ Actualizado</em>, <em>◔ Con rezago</em>, <em>! Desactualizado</em> o <em>■ Serie cerrada</em>). Cuando un indicador es regional o provincial, una etiqueta ámbar advierte su alcance exacto.</p>
          </div>
        </div>
      </div>`,
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="ficha"><h2>Ficha institucional y territorial del municipio</h2><dl>
        <div><dt>Código DANE</dt><dd>25875 (Departamento 25 · Cundinamarca)</dd></div>
        <div><dt>Provincia administrativa</dt><dd>Gualivá (capital provincial)</dd></div>
        <div><dt>Autoridad ambiental y cuenca</dt><dd>CAR Cundinamarca (Regional Gualivá) · Cuenca río Tobia – río Negro</dd></div>
        <div><dt>Cámara de Comercio</dt><dd>Facatativá (código RUES 47)</dd></div>
        <div><dt>Centro Zonal ICBF</dt><dd>CZ Villeta (código 2505)</dd></div>
        <div><dt>Gestor catastral</dt><dd>Agencia Catastral de Cundinamarca (ACC)</dd></div>
        <div><dt>Prestador urbano de AAA</dt><dd>Empresa de Servicios Públicos E.S.P. de Villeta (+ 4 acueductos comunitarios en SUI)</dd></div>
        <div><dt>Corredor vial nacional</dt><dd>Ruta Nacional 50 (Bogotá – La Vega – Villeta – Guaduas · Peaje Caiquero)</dd></div>
      </dl></div>`,
    },
  ],
};
