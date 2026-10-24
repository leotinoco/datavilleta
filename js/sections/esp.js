// Empresa de Servicios Públicos de Villeta: IANC, operación, estados financieros y evaluación de la
// Superservicios. Las cifras vienen de documentos oficiales en PDF (sin API abierta) transcritas en
// data/esp-villeta.json; la contratación se consulta en vivo en SECOP.
import { num, cop, pct, change, escapeHtml, fecha, toNum, mes, MESES_CORTOS } from '../format.js';
import { ofYear, ofMonth, ofDate } from '../freshness.js';
import { THIS_YEAR } from './helpers.js';
import { secopBase } from './contratacion.js';

let cache = null;
function datos() {
  cache ??= fetch('data/esp-villeta.json', { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error('No se encontró data/esp-villeta.json');
    return r.json();
  }).catch(e => { cache = null; throw e; });
  return cache;
}

// Cita de documento oficial (pie de tarjeta).
const cita = (d, ...keys) => keys.map(k => {
  const doc = d.documentos[k];
  return `<span class="source-entity">${escapeHtml(doc.entidad)}</span> — <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener">${escapeHtml(doc.titulo)}</a> <span class="muted">(documento oficial en PDF; cifras transcritas en data/esp-villeta.json)</span>`;
});

const SERV = [['acueducto', 'Acueducto'], ['alcantarillado', 'Alcantarillado'], ['aseo', 'Aseo']];
const ratio = (a, b) => (a == null || !b ? null : (a / b) * 100);
const ultimo = arr => arr[arr.length - 1];

export default {
  id: 'esp',
  eyebrow: 'Empresa de Servicios Públicos E.S.P. de Villeta',
  title: 'ESP Villeta: agua, finanzas y desempeño',
  intro: 'Principal empresa del municipio: presta acueducto, alcantarillado y aseo. Aquí se reúnen su índice de agua no contabilizada (IANC), indicadores de operación, estados financieros 2018–2025 y la evaluación integral publicada por la Superintendencia de Servicios Públicos en agosto de 2026. Las cifras contables provienen de los PDF oficiales de la empresa y de la Superservicios (no hay API abierta con estos datos) y cada tarjeta enlaza el documento original.',
  blocks: [
    {
      type: 'kpis',
      title: 'Resumen de la empresa',
      wide: true,
      async load() {
        const d = await datos();
        const er = d.estadoResultados;
        const [e24, e25] = [er.find(r => r.anio === 2024), er.find(r => r.anio === 2025)];
        const [ianPrev, ianLast] = d.ianc.anual.slice(-2);
        const [u23, u24] = d.ius.registros;
        const op = ultimo(d.operacion);
        return {
          asOf: false,
          kpis: [
            { label: 'Ingresos por servicios 2025', value: cop(e25.ingresos.total), delta: change(e25.ingresos.total, e24.ingresos.total), goodWhen: 'up', deltaLabel: 'vs 2024', asOf: ofYear(2025) },
            { label: 'Resultado neto 2025', value: cop(e25.utilidadNeta), hint: `2024: ${cop(e24.utilidadNeta)} (utilidad)`, asOf: ofYear(2025) },
            { label: `Agua no contabilizada (IANC) ${ianLast.anio}`, value: pct(ianLast.valor, 2), delta: change(ianLast.valor, ianPrev.valor), goodWhen: 'down', deltaLabel: `vs ${ianPrev.anio}`, hint: `Meta de la empresa: ${d.ianc.metaEmpresa} %`, asOf: ofYear(ianLast.anio) },
            { label: 'Indicador Único Sectorial (IUS)', value: `${num(u24.total, 1)} / 100`, delta: change(u24.total, u23.total), goodWhen: 'up', deltaLabel: 'vs 2023', hint: `${u24.riesgo} (2023: ${u23.riesgo.toLowerCase()})`, asOf: ofYear(u24.anio) },
            { label: 'Continuidad del acueducto', value: `${num(op.continuidadHorasDia, 2)} h/día`, hint: 'Horas promedio de servicio al día (meta: 24)', asOf: ofYear(op.anio) },
            { label: 'Personal', value: num(d.empresa.personal.total), hint: `${d.empresa.personal.administrativo} administrativos · ${d.empresa.personal.operativo} operativos`, asOf: ofMonth(...d.empresa.personal.corte.split('-')) },
          ],
          html: `<p class="note">NIT ${escapeHtml(d.empresa.nit)} · ID SUI ${escapeHtml(d.empresa.idSui)} · ${escapeHtml(d.empresa.naturaleza)} · creada por ${escapeHtml(d.empresa.creacion)} · opera desde ${fecha(d.empresa.inicioOperacion)} · <a href="${escapeHtml(d.empresa.web)}" target="_blank" rel="noopener">sitio web de la empresa</a></p>`,
          sourceText: cita(d, 'ef2025', 'cs2025', 'sspd2026'),
        };
      },
    },

    { type: 'heading', title: 'Agua no contabilizada y gestión comercial', text: 'El <strong>IANC</strong> mide qué porcentaje del agua tratada que sale de la planta no llega a facturarse: pérdidas técnicas (fugas en redes) y comerciales (conexiones sin medidor, fraudes o submedición). Fórmula: ((volumen producido − volumen facturado) ÷ volumen producido) × 100. Menor es mejor.' },
    {
      type: 'chart',
      title: 'Índice de agua no contabilizada (IANC) 2012–2025',
      subtitle: 'Porcentaje del agua producida que no se factura, según los documentos oficiales de cada año',
      wide: true,
      async load() {
        const d = await datos();
        const { anual, sinDato, metaEmpresa } = d.ianc;
        const desde = anual[0].anio;
        const hasta = ultimo(anual).anio;
        const anios = [];
        for (let y = desde; y <= hasta; y++) anios.push(y);
        const reg = y => anual.find(r => r.anio === y);
        const falta = y => sinDato.find(r => r.anio === y);
        const fuentes = [...new Set(anual.flatMap(r => [r.fuente, r.fuente2]).concat(sinDato.map(r => r.fuente)).filter(Boolean))];
        return {
          labelTitle: 'Año',
          asOf: ofYear(hasta),
          chart: {
            kind: 'bar', format: 'pct', max: 60,
            labels: anios.map(String),
            series: [{ name: 'IANC', data: anios.map(y => reg(y)?.valor ?? null) }],
            threshold: { value: metaEmpresa, label: `Meta de la empresa (${metaEmpresa} %)` },
            footer: i => { const r = reg(anios[i]); return r ? r.tipo : `Sin dato: ${falta(anios[i])?.nota || 'no publicado'}`; },
          },
          table: {
            columns: [
              { key: 'anio', label: 'Año' },
              { key: 'valor', label: 'IANC', align: 'right', format: v => (v == null ? 'Sin dato' : pct(v, 2)) },
              { key: 'tipo', label: 'Tipo de dato' },
              { key: 'nota', label: 'Observación' },
              { key: 'fuente', label: 'Documento', html: v => (v ? `<a href="${escapeHtml(d.documentos[v].url)}" target="_blank" rel="noopener">${escapeHtml(d.documentos[v].titulo)}</a>` : '—') },
            ],
            rows: anios.map(y => ({ anio: y, valor: reg(y)?.valor ?? null, tipo: reg(y)?.tipo || '—', nota: reg(y)?.nota || falta(y)?.nota || '', fuente: reg(y)?.fuente || falta(y)?.fuente || null })),
          },
          note: `Con dato en ${anual.length} de ${anios.length} años. ${d.ianc._nota} Las barras vacías son años sin un valor válido publicado (ver "Ver tabla").`,
          sourceText: cita(d, ...fuentes),
        };
      },
    },
    {
      type: 'chart',
      title: 'IANC mensual: comparativo 2023–2025',
      subtitle: 'Porcentaje de agua no facturada cada mes, un año por línea',
      async load() {
        const d = await datos();
        const m = d.ianc.mensual;
        const todos = m.flatMap(a => a.meses.filter(x => x.ianc != null).map(x => ({ ...x, anio: a.anio })));
        const peor = todos.reduce((a, b) => (b.ianc > a.ianc ? b : a));
        const mejor = todos.reduce((a, b) => (b.ianc < a.ianc ? b : a));
        return {
          labelTitle: 'Mes',
          asOf: ofMonth(ultimo(m).anio, 12),
          chart: { kind: 'line', format: 'pct', beginAtZero: false, labels: MESES_CORTOS, series: m.map(a => ({ name: String(a.anio), data: a.meses.map(x => x.ianc) })) },
          note: `Mes con mayor pérdida: ${mes(peor.mes)} ${peor.anio} (${pct(peor.ianc, 2)}); con menor: ${mes(mejor.mes)} ${mejor.anio} (${pct(mejor.ianc, 2)}). Marzo de 2024 se publicó sin volumen producido.`,
          sourceText: cita(d, ...m.map(a => a.fuente)),
        };
      },
    },
    {
      type: 'chart',
      title: 'Agua producida vs. agua facturada',
      subtitle: 'Metros cúbicos por mes; la diferencia es el agua no contabilizada',
      async load() {
        const d = await datos();
        const meses = d.ianc.mensual.flatMap(a => a.meses.map(x => ({ ...x, anio: a.anio })));
        const totales = d.ianc.mensual.map(a => {
          const ok = a.meses.filter(x => x.producido != null);
          const P = ok.reduce((s, x) => s + x.producido, 0);
          const F = ok.reduce((s, x) => s + x.facturado, 0);
          return `${a.anio}: ${num(P)} m³ producidos y ${num(F)} facturados (${num(P - F)} m³ no contabilizados)`;
        });
        return {
          labelTitle: 'Mes',
          asOf: ofMonth(ultimo(d.ianc.mensual).anio, 12),
          chart: { kind: 'line', labels: meses.map(x => `${mes(x.mes)} ${x.anio}`), series: [{ name: 'Producida (m³)', data: meses.map(x => x.producido) }, { name: 'Facturada (m³)', data: meses.map(x => x.facturado) }] },
          note: `${totales.join('. ')}.`,
          sourceText: cita(d, ...d.ianc.mensual.map(a => a.fuente)),
        };
      },
    },
    {
      type: 'chart',
      title: 'Cobertura, medición y recaudo',
      subtitle: 'Indicadores de gestión de la empresa frente a su meta (%)',
      async load() {
        const d = await datos();
        const ig = d.indicadoresGestion;
        const ind = [['coberturaMedicion', 'Cobertura de medición'], ['coberturaAcueducto', 'Cobertura acueducto'], ['coberturaAlcantarillado', 'Cobertura alcantarillado'], ['eficienciaRecaudo', 'Eficiencia del recaudo']];
        return {
          labelTitle: 'Indicador',
          asOf: ofYear(ultimo(ig.registros).anio),
          chart: {
            kind: 'hbar', format: 'pct', max: 100,
            labels: ind.map(i => i[1]),
            series: [
              ...ig.registros.map((r, k) => ({ name: String(r.anio), data: ind.map(([key]) => r[key]), color: k })),
              { name: 'Meta', data: ind.map(([key]) => ig.metas[key]), muted: true },
            ],
          },
          note: 'Cobertura de medición: porcentaje de suscriptores con medidor. Eficiencia del recaudo: valor recaudado sobre valor facturado.',
          sourceText: cita(d, 'ind2023', 'ind2024'),
        };
      },
    },
    {
      type: 'kpis',
      title: 'Calidad y continuidad del servicio (evaluación Superservicios)',
      async load() {
        const d = await datos();
        const op = ultimo(d.operacion);
        const a = ofYear(op.anio);
        return {
          asOf: a,
          kpis: [
            { label: 'Continuidad del acueducto', value: `${num(op.continuidadHorasDia, 2)} h/día`, hint: `${num((op.continuidadHorasDia / 24) * 100, 0)} % del día` },
            { label: 'Calidad del agua (IRCA)', value: `${op.ircaMesesCumplen} de ${op.ircaMesesReportados} meses`, hint: 'Meses sin riesgo (IRCA < 5 %) reportados al INS' },
            { label: 'Riesgo por abastecimiento (IRABApp)', value: pct(op.irabapp, 0), hint: 'Registrado por el INS en SIVICAP' },
            { label: 'Atención de PQR', value: `${num(op.ipqrAcueducto, 1)} / 100`, hint: 'Índice normalizado (acueducto y alcantarillado)' },
          ],
          note: `Mediciones del año ${op.anio} incluidas en el Indicador Único Sectorial.`,
          sourceText: cita(d, 'sspd2026'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Indicador Único Sectorial (IUS) por dimensión',
      subtitle: 'Puntaje de la Superservicios / CRA por dimensión (máximo 12,5 cada una)',
      wide: true,
      async load() {
        const d = await datos();
        const { dimensiones, registros } = d.ius;
        const keys = Object.keys(dimensiones);
        return {
          labelTitle: 'Dimensión',
          asOf: ofYear(ultimo(registros).anio),
          chart: {
            kind: 'hbar', format: 'dec2', max: 12.5,
            labels: keys.map(k => dimensiones[k]),
            series: registros.map((r, i) => ({ name: `${r.anio} (total ${num(r.total, 1)} · ${r.riesgo})`, data: keys.map(k => r[k]), color: i })),
          },
          note: 'El IUS (Res. CRA 906 de 2019) suma ocho dimensiones de 12,5 puntos. La empresa pasó de riesgo medio (75,5) en 2023 a riesgo bajo (90,4) en 2024; la mayor mejora fue en gestión tarifaria y sostenibilidad financiera.',
          sourceText: cita(d, 'sspd2026'),
        };
      },
    },

    { type: 'heading', title: 'Estados financieros 2018–2025', text: 'Cifras de los estados financieros publicados por la empresa (resultado integral y situación financiera), verificadas contra el análisis de la Superservicios para 2024 y 2025.' },
    {
      type: 'chart',
      title: 'Ingresos por prestación de servicios',
      subtitle: 'Ingresos de actividades ordinarias por año (pesos corrientes)',
      async load() {
        const d = await datos();
        const er = d.estadoResultados;
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(er).anio),
          chart: { kind: 'bar', format: 'cop', labels: er.map(r => String(r.anio)), series: [{ name: 'Ingresos', data: er.map(r => r.ingresos.total) }], yoy: true },
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2019'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Resultado neto del ejercicio',
      subtitle: 'Utilidad o pérdida por año',
      async load() {
        const d = await datos();
        const er = d.estadoResultados;
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(er).anio),
          chart: { kind: 'bar', format: 'cop', beginAtZero: true, labels: er.map(r => String(r.anio)), series: [{ name: 'Resultado neto', data: er.map(r => r.utilidadNeta) }] },
          note: 'Pérdidas en 2022 y 2025. En 2025 los costos crecieron 12,7 % y los ingresos 5,6 %.',
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2019'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Ingresos por servicio',
      subtitle: 'Acueducto, alcantarillado y aseo, 2020–2025',
      async load() {
        const d = await datos();
        const er = d.estadoResultados.filter(r => r.ingresos.acueducto != null);
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(er).anio),
          chart: { kind: 'line', format: 'cop', labels: er.map(r => String(r.anio)), series: SERV.map(([k, n]) => ({ name: n, data: er.map(r => r.ingresos[k]) })) },
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Margen bruto por servicio',
      subtitle: '(Ingresos − costo de ventas) ÷ ingresos, por servicio',
      async load() {
        const d = await datos();
        const er = d.estadoResultados.filter(r => r.ingresos.acueducto != null);
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(er).anio),
          chart: { kind: 'line', format: 'pct', labels: er.map(r => String(r.anio)), series: SERV.map(([k, n]) => ({ name: n, data: er.map(r => ratio(r.ingresos[k] - r.costos[k], r.ingresos[k])) })) },
          note: 'El aseo cayó a un margen bruto de 4,5 % en 2025: sus costos consumen casi todo lo que factura. El alcantarillado conserva el mayor margen.',
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Resultado neto por servicio',
      subtitle: 'Utilidad o pérdida de cada servicio según el reporte al SUI',
      async load() {
        const d = await datos();
        const rs = d.resultadoPorServicio;
        return {
          labelTitle: 'Servicio', asOf: ofYear(ultimo(rs).anio),
          chart: { kind: 'bar', format: 'cop', labels: SERV.map(s => s[1]), series: rs.map((r, i) => ({ name: String(r.anio), data: SERV.map(([k]) => r[k].utilidadNeta), color: i })) },
          note: 'Hallazgo de la Superservicios: los gastos administrativos asignados al alcantarillado pasaron de 43 % a 66 % de sus ingresos en 2025 sin justificación en las notas a los estados financieros.',
          sourceText: cita(d, 'sspd2026'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Ingresos frente a costos y gastos operacionales',
      subtitle: 'Ingresos por servicios vs. costo de ventas + gastos de administración',
      wide: true,
      async load() {
        const d = await datos();
        const er = d.estadoResultados;
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(er).anio),
          chart: { kind: 'line', format: 'cop', beginAtZero: false, labels: er.map(r => String(r.anio)), series: [{ name: 'Ingresos por servicios', data: er.map(r => r.ingresos.total) }, { name: 'Costos + gastos de administración', data: er.map(r => r.costos.total + r.gastosAdmin) }] },
          note: 'Desde 2019 los costos y gastos operacionales superan a los ingresos por servicios; la diferencia se cubre con ingresos no operacionales (venta de bienes, laboratorio y otros). En 2025 la brecha fue de $456 millones.',
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2019'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Liquidez: activo corriente vs. pasivo corriente',
      subtitle: 'Saldos al 31 de diciembre (todo el pasivo de la empresa es de corto plazo)',
      async load() {
        const d = await datos();
        const sf = d.situacionFinanciera;
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(sf).anio),
          chart: { kind: 'line', format: 'cop', labels: sf.map(r => String(r.anio)), series: [{ name: 'Activo corriente', data: sf.map(r => r.activoCorriente) }, { name: 'Pasivo corriente', data: sf.map(r => r.pasivoCorriente) }] },
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2020'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Cartera: cuentas por cobrar',
      subtitle: 'Saldo al cierre y días de cartera (cuentas por cobrar × 365 ÷ ingresos)',
      async load() {
        const d = await datos();
        const sf = d.situacionFinanciera;
        const ing = y => d.estadoResultados.find(r => r.anio === y)?.ingresos.total;
        const rows = sf.map(r => ({ anio: r.anio, cxc: r.cuentasPorCobrar, dias: ing(r.anio) ? (r.cuentasPorCobrar * 365) / ing(r.anio) : null }));
        return {
          labelTitle: 'Año', asOf: ofYear(ultimo(sf).anio),
          chart: { kind: 'bar', format: 'cop', labels: rows.map(r => String(r.anio)), series: [{ name: 'Cuentas por cobrar', data: rows.map(r => r.cxc) }], yoy: true },
          table: { columns: [{ key: 'anio', label: 'Año' }, { key: 'cxc', label: 'Cuentas por cobrar', align: 'right', format: v => cop(v) }, { key: 'dias', label: 'Días de cartera', align: 'right', format: v => num(v, 1) }], rows },
          note: `Días de cartera 2025: ${num(ultimo(rows).dias, 1)} (2024: ${num(rows.at(-2).dias, 1)}).`,
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2020'),
        };
      },
    },
    {
      type: 'table',
      title: 'Indicadores financieros',
      subtitle: 'Calculados a partir de los estados financieros (2024 y 2025 coinciden con el cálculo de la Superservicios)',
      wide: true,
      async load() {
        const d = await datos();
        const rows = d.situacionFinanciera.map(s => {
          const e = d.estadoResultados.find(r => r.anio === s.anio);
          return {
            anio: s.anio,
            razon: s.activoCorriente / s.pasivoCorriente,
            endeud: ratio(s.pasivoTotal, s.activoTotal),
            mBruto: ratio(e.utilidadBruta, e.ingresos.total),
            mOper: ratio(e.utilidadBruta - e.gastosAdmin, e.ingresos.total),
            mNeto: ratio(e.utilidadNeta, e.ingresos.total),
            roa: ratio(e.utilidadNeta, s.activoTotal),
            dias: (s.cuentasPorCobrar * 365) / e.ingresos.total,
            cubr: e.ingresos.total / (e.costos.total + e.gastosAdmin),
          };
        });
        const p = v => pct(v, 2);
        return {
          asOf: ofYear(ultimo(rows).anio),
          table: {
            columns: [
              { key: 'anio', label: 'Año' },
              { key: 'razon', label: 'Razón corriente', align: 'right', format: v => num(v, 2) },
              { key: 'endeud', label: 'Endeudamiento', align: 'right', format: p },
              { key: 'mBruto', label: 'Margen bruto', align: 'right', format: p },
              { key: 'mOper', label: 'Margen operacional', align: 'right', format: p },
              { key: 'mNeto', label: 'Margen neto', align: 'right', format: p },
              { key: 'roa', label: 'ROA', align: 'right', format: p },
              { key: 'dias', label: 'Días de cartera', align: 'right', format: v => num(v, 1) },
              { key: 'cubr', label: 'Cubrimiento costos y gastos', align: 'right', format: v => num(v, 2) },
            ],
            rows,
          },
          note: 'Razón corriente = activo corriente ÷ pasivo corriente (más de 1 indica capacidad de pago de corto plazo). Margen operacional = (utilidad bruta − gastos de administración) ÷ ingresos. Cubrimiento < 1: los ingresos por servicios no alcanzan a cubrir costos y gastos operacionales.',
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2020', 'sspd2026'),
        };
      },
    },
    {
      type: 'table',
      title: 'Estado de resultados detallado',
      subtitle: 'Pesos corrientes',
      wide: true,
      async load() {
        const d = await datos();
        const er = d.estadoResultados;
        const filas = [
          ['Ingresos – acueducto', r => r.ingresos.acueducto], ['Ingresos – alcantarillado', r => r.ingresos.alcantarillado], ['Ingresos – aseo', r => r.ingresos.aseo],
          ['Total ingresos por servicios', r => r.ingresos.total],
          ['Costo de ventas – acueducto', r => r.costos.acueducto], ['Costo de ventas – alcantarillado', r => r.costos.alcantarillado], ['Costo de ventas – aseo', r => r.costos.aseo],
          ['Total costo de ventas', r => r.costos.total], ['Utilidad bruta', r => r.utilidadBruta], ['Gastos de administración', r => r.gastosAdmin],
          ['Ingresos no operacionales', r => r.ingresosNoOperacionales], ['Otros gastos', r => r.otrosGastos], ['Impuesto de renta', r => r.impuesto], ['Resultado neto', r => r.utilidadNeta],
        ];
        return {
          asOf: ofYear(ultimo(er).anio),
          table: {
            columns: [{ key: 'cuenta', label: 'Cuenta' }, ...er.map(r => ({ key: `y${r.anio}`, label: String(r.anio), align: 'right', format: v => (v == null ? '—' : num(v)) }))],
            rows: filas.map(([cuenta, f]) => Object.fromEntries([['cuenta', cuenta], ...er.map(r => [`y${r.anio}`, f(r)])])),
          },
          note: '2018 y 2019 se publicaron sin desagregar por servicio.',
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2019'),
        };
      },
    },
    {
      type: 'table',
      title: 'Estado de situación financiera detallado',
      subtitle: 'Saldos al 31 de diciembre, pesos corrientes',
      wide: true,
      async load() {
        const d = await datos();
        const sf = d.situacionFinanciera;
        const filas = [
          ['Efectivo y equivalentes', 'efectivo'], ['Cuentas por cobrar', 'cuentasPorCobrar'], ['Inventarios', 'inventarios'], ['Anticipos y avances', 'anticipos'], ['Anticipo de impuestos', 'anticipoImpuestos'],
          ['Total activo corriente', 'activoCorriente'], ['Propiedad, planta y equipo', 'ppe'], ['Intangibles', 'intangibles'], ['Total activo', 'activoTotal'],
          ['Cuentas por pagar', 'cuentasPorPagar'], ['Beneficios a empleados', 'beneficiosEmpleados'], ['Total pasivo (corriente)', 'pasivoTotal'],
          ['Capital fiscal', 'capitalFiscal'], ['Pérdidas acumuladas', 'perdidasAcumuladas'], ['Total patrimonio', 'patrimonio'],
        ];
        return {
          asOf: ofYear(ultimo(sf).anio),
          table: {
            columns: [{ key: 'cuenta', label: 'Cuenta' }, ...sf.map(r => ({ key: `y${r.anio}`, label: String(r.anio), align: 'right', format: v => num(v) }))],
            rows: filas.map(([cuenta, k]) => Object.fromEntries([['cuenta', cuenta], ...sf.map(r => [`y${r.anio}`, r[k]])])),
          },
          sourceText: cita(d, 'ef2025', 'ef2023', 'ef2021', 'ef2020'),
        };
      },
    },

    { type: 'heading', title: 'Presupuesto, reporte de información y hallazgos' },
    {
      type: 'chart',
      title: 'Ejecución de ingresos 2025 (a octubre)',
      subtitle: 'Apropiación anual vs. recaudo acumulado por servicio',
      async load() {
        const d = await datos();
        const ej = d.ejecucion2025;
        const serv = ej.ingresos.filter(r => !/^Total/.test(r.rubro));
        return {
          labelTitle: 'Rubro', asOf: ofDate(ej.corte),
          chart: { kind: 'hbar', format: 'cop', labels: serv.map(r => r.rubro), series: [{ name: 'Apropiación', data: serv.map(r => r.apropiacion) }, { name: 'Recaudo a octubre', data: serv.map(r => r.recaudo) }] },
          table: {
            columns: [{ key: 'rubro', label: 'Rubro' }, { key: 'apropiacion', label: 'Apropiación', align: 'right', format: v => cop(v) }, { key: 'recaudo', label: 'Recaudo', align: 'right', format: v => cop(v) }, { key: 'p', label: '% recaudado', align: 'right', format: v => pct(v, 1) }],
            rows: ej.ingresos.map(r => ({ ...r, p: ratio(r.recaudo, r.apropiacion) })),
          },
          note: `Presupuesto aprobado: ${d.presupuesto.map(p => `${p.vigencia} ${cop(p.total)} (${p.acto})`).join(' · ')}. Según la Superservicios, más del 93 % se destina a funcionamiento y operación.`,
          sourceText: cita(d, 'gestion2025', 'sspd2026'),
        };
      },
    },
    {
      type: 'chart',
      title: 'Cumplimiento del reporte al SUI',
      subtitle: 'Porcentaje de formatos y formularios cargados a la Superservicios',
      async load() {
        const d = await datos();
        const r = d.reporteSui.registros;
        return {
          labelTitle: 'Año', asOf: ofDate(d.reporteSui.corte),
          chart: { kind: 'bar', format: 'pct', max: 100, labels: r.map(x => (x.parcial ? `${x.anio}*` : String(x.anio))), series: [{ name: '% de cargue', data: r.map(x => x.pct) }], partialLast: true },
          table: { columns: [{ key: 'anio', label: 'Año' }, { key: 'radicados', label: 'Reportes radicados', align: 'right' }, { key: 'pendientes', label: 'Pendientes', align: 'right' }, { key: 'pct', label: '% de cargue', align: 'right', format: v => pct(v, 0) }], rows: r },
          note: `Corte ${fecha(d.reporteSui.corte)}. * 2026 en curso. Entre los pendientes de 2025 están los costos y gastos de acueducto y alcantarillado.`,
          sourceText: cita(d, 'sspd2026'),
        };
      },
    },
    {
      type: 'table',
      title: 'Hallazgos y conclusiones de la Superservicios',
      subtitle: 'Evaluación integral 2026 (periodo 2024–2025)',
      wide: true,
      async load() {
        const d = await datos();
        return {
          asOf: ofDate(d.documentos.sspd2026.fecha),
          table: { columns: [{ key: 'n', label: '#' }, { key: 'texto', label: 'Hallazgo / conclusión' }], rows: d.hallazgos.lista.map((texto, i) => ({ n: i + 1, texto })) },
          sourceText: cita(d, 'sspd2026'),
        };
      },
    },

    { type: 'heading', title: 'Contratación de la ESP (en vivo)' },
    {
      type: 'chart',
      title: 'Contratos firmados por la ESP Villeta',
      subtitle: 'Valor contratado por año según SECOP I y II',
      wide: true,
      async load({ q, M }) {
        const rows = (await q('secop', {
          $select: 'date_extract_y(fecha_de_firma_del_contrato) as y, count(*) as n, sum(valor_contrato) as v',
          $where: `${secopBase(M)} and upper(nombre_de_la_entidad) like '%SERVICIOS P%BLICOS%'`, $group: 'y', $order: 'y',
        })).filter(r => r.y && Number(r.y) <= THIS_YEAR);
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Año',
          asOf: ofYear(ultimo(rows).y),
          chart: { kind: 'bar', format: 'cop', labels: rows.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y)), series: [{ name: 'Valor contratado', data: rows.map(r => toNum(r.v)) }], yoy: true, partialLast: Number(ultimo(rows).y) === THIS_YEAR },
          table: { columns: [{ key: 'y', label: 'Año' }, { key: 'n', label: 'Contratos', align: 'right', format: v => num(toNum(v)) }, { key: 'v', label: 'Valor', align: 'right', format: v => cop(toNum(v)) }], rows },
          note: `${Number(ultimo(rows).y) < THIS_YEAR - 1 ? `Atención: la ESP no registra contratos en SECOP desde ${ultimo(rows).y}, aunque su informe de gestión 2025 relaciona contratos de esa vigencia (p. ej. el 044-2025 de compra de medidores). ` : ''}El detalle de cada contrato está en la sección Contratación (filtro "Empresa de Servicios Públicos de Villeta").`,
          sourceText: cita(await datos(), 'gestion2025'),
        };
      },
    },
  ],
};
