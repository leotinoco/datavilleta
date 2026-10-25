import { num, toNum, change, mes, MESES_CORTOS, titleCase, periodo, escapeHtml, fecha } from '../format.js';
import { THIS_YEAR, corteRnt, corteFecha, ytdWhere, ytdLabel } from './helpers.js';
import { ofMonth, ofYear, mesNumero } from '../freshness.js';

const corteSuper = (q, M) => corteFecha(q, 'supertransporte', 'fecha_despacho', `municipio_destino_ruta='${M.dane}'`);

const RNT = M => `cod_mun='${M.dane}'`;

// Serie anual del RNT (tablero de MinCIT, sin API abierta) transcrita en data/rnt-historico-villeta.json.
let rntCache = null;
const rntHist = () => (rntCache ??= fetch('data/rnt-historico-villeta.json', { cache: 'no-cache' }).then(r => {
  if (!r.ok) throw new Error('No se encontró data/rnt-historico-villeta.json');
  return r.json();
}).catch(e => { rntCache = null; throw e; }));

const citaRnt = d => `<span class="source-entity">${escapeHtml(d.fuente.entidad)}</span> — <a href="${escapeHtml(d.fuente.url)}" target="_blank" rel="noopener">${escapeHtml(d.fuente.nombre)}</a> <span class="muted">(consulta pública del tablero, actualizado el ${fecha(`${d.fuente.actualizacion}T12:00:00`)}; 2026 acumulado al ${fecha(`${d.fuente.corte}T12:00:00`)}; cifras transcritas en data/rnt-historico-villeta.json)</span>`;

// Tipos de prestador. Las subcategorías cambiaron de nombre con los años; se agrupan sin tildes.
const TIPOS = [
  ['hotel', 'Hoteles', s => s === 'HOTEL'],
  ['centro', 'Centros vacacionales', s => s.includes('CENTRO VACACIONAL')],
  ['hostal', 'Hostales y apartahoteles', s => s.includes('HOSTAL') || s.includes('APARTAHOTEL')],
  ['glamping', 'Glamping, campamentos y similares', s => /GLAMPING|CAMPAMENTO|ALBERGUE|REFUGIO/.test(s)],
  ['apartamento', 'Apartamentos turísticos', s => s.includes('APARTAMENTO')],
  ['casa', 'Casas turísticas', s => s.includes('CASA TURISTICA')],
  ['finca', 'Fincas turísticas', s => s.includes('FINCA') || s.includes('ALOJAMIENTO RURAL')],
  ['otra', 'Otras viviendas y hospedajes', s => s.includes('VIVIENDA') || s.includes('HOSPEDAJE')],
  ['servicios', 'Agencias, guías y otros', () => true],
];
const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const tipoDe = sub => TIPOS.find(([, , f]) => f(sinTildes(sub)))[0];

// { año: { tipo: valor } } para la columna indicada de 'historico' (3 = prestadores, 4 = habitaciones, 5 = camas) o de 'nuevos'.
function porTipo(filas, col = 3) {
  const out = {};
  for (const f of filas) {
    const y = String(f[0]);
    out[y] ??= {};
    const t = tipoDe(f[2]);
    out[y][t] = (out[y][t] || 0) + f[col];
  }
  return out;
}
const sumaAnio = o => Object.values(o || {}).reduce((a, b) => a + b, 0);

export default {
  id: 'turismo',
  title: 'Turismo y hotelería',
  intro: 'Oferta turística formal inscrita en el Registro Nacional de Turismo (capacidad de alojamiento, tipo de prestador y empleo reportado) y llegada de pasajeros a Villeta desde las terminales de transporte vigiladas por la Superintendencia de Transporte.',
  blocks: [
    {
      type: 'kpis',
      title: 'Oferta turística registrada (RNT vigente)',
      wide: true,
      async load({ q, M }) {
        const [tot] = await q('rnt', { $select: 'count(*) as n, sum(habitaciones) as h, sum(camas) as c, sum(num_emp1) as e, max(ano) as ano, max(periodo) as periodo', $where: `${RNT(M)} and estado_rnt='ACTIVO'` });
        const [aloj] = await q('rnt', { $select: 'count(*) as n', $where: `${RNT(M)} and estado_rnt='ACTIVO' and (habitaciones > 0 or camas > 0)` });
        const corte = `Corte del registro: ${titleCase(tot.periodo || '')} ${tot.ano || ''}`.trim();
        return {
          kpis: [
            { label: 'Prestadores turísticos activos', value: num(toNum(tot.n)), hint: corte, source: 'rnt' },
            { label: 'Prestadores con alojamiento', value: num(toNum(aloj.n)), hint: 'Hoteles, hostales, fincas y viviendas turísticas', source: 'rnt' },
            { label: 'Habitaciones', value: num(toNum(tot.h)), hint: 'Capacidad declarada en el RNT', source: 'rnt' },
            { label: 'Camas', value: num(toNum(tot.c)), hint: 'Capacidad declarada en el RNT', source: 'rnt' },
            { label: 'Empleos reportados', value: num(toNum(tot.e)), hint: 'Suma de empleados declarados por los prestadores', source: 'rnt' },
          ],
          asOf: ofMonth(tot.ano, mesNumero(tot.periodo), { kind: 'snapshot' }),
          note: 'Registro vigente publicado en datos.gov.co (una fotografía del mes de corte). La evolución año a año desde 2005 está en la sección siguiente.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Prestadores turísticos por tipo',
      subtitle: 'Número de prestadores activos por subcategoría del RNT',
      async load({ q, M }) {
        const rows = await q('rnt', { $select: 'sub_categoria, count(*) as n', $where: `${RNT(M)} and estado_rnt='ACTIVO'`, $group: 'sub_categoria', $order: 'n DESC' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Subcategoría',
          asOf: await corteRnt(q, M),
          chart: { kind: 'hbar', labels: rows.map(r => titleCase(r.sub_categoria)), series: [{ name: 'Prestadores', data: rows.map(r => toNum(r.n)) }] },
        };
      },
    },
    {
      type: 'chart',
      title: 'Capacidad de alojamiento por tipo',
      subtitle: 'Camas y habitaciones declaradas, por subcategoría',
      async load({ q, M }) {
        const rows = await q('rnt', { $select: 'sub_categoria, sum(camas) as c, sum(habitaciones) as h', $where: `${RNT(M)} and estado_rnt='ACTIVO' and camas > 0`, $group: 'sub_categoria', $order: 'c DESC' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Subcategoría',
          asOf: await corteRnt(q, M),
          chart: {
            kind: 'hbar',
            labels: rows.map(r => titleCase(r.sub_categoria)),
            series: [{ name: 'Camas', data: rows.map(r => toNum(r.c)) }, { name: 'Habitaciones', data: rows.map(r => toNum(r.h)) }],
          },
        };
      },
    },
    {
      type: 'table',
      title: 'Establecimientos de alojamiento',
      subtitle: 'Hoteles, hostales, centros vacacionales y similares, ordenados por número de camas',
      wide: true,
      async load({ q, M }) {
        const rows = await q('rnt', {
          $select: 'codigo_rnt, razon_social_establecimiento, sub_categoria, habitaciones, camas, num_emp1',
          $where: `${RNT(M)} and estado_rnt='ACTIVO' and categoria like 'ESTABLECIMIENTOS DE ALOJAMIENTO%'`,
          $order: 'camas DESC', $limit: 200,
        });
        if (!rows.length) return { empty: true };
        return {
          asOf: await corteRnt(q, M),
          table: {
            columns: [
              { key: 'razon_social_establecimiento', label: 'Establecimiento', format: v => titleCase(v) },
              { key: 'sub_categoria', label: 'Tipo', format: v => titleCase(v) },
              { key: 'habitaciones', label: 'Habitaciones', align: 'right', format: v => num(toNum(v)) },
              { key: 'camas', label: 'Camas', align: 'right', format: v => num(toNum(v)) },
              { key: 'num_emp1', label: 'Empleados', align: 'right', format: v => num(toNum(v)) },
              { key: 'codigo_rnt', label: 'Código RNT', align: 'right' },
            ],
            rows,
          },
        };
      },
    },

    { type: 'heading', title: 'Evolución del registro turístico, 2005–2026', text: 'Prestadores con Registro Nacional de Turismo activo en Villeta cada año, nuevas inscripciones y salidas del registro, según el tablero histórico del Viceministerio de Turismo. Un prestador sale del registro cuando no lo renueva (plazo: 31 de marzo de cada año) o lo cancela; dejar el RNT no siempre significa que el negocio cerró, pero sí que dejó de operar formalmente.' },
    {
      type: 'chart',
      title: 'Prestadores turísticos activos por año',
      subtitle: 'Número de prestadores con RNT activo en Villeta, por tipo',
      wide: true,
      async load() {
        const d = await rntHist();
        const a = porTipo(d.historico);
        const anios = Object.keys(a).sort();
        const grupos = [
          ['Establecimientos de alojamiento', ['hotel', 'centro', 'hostal', 'glamping']],
          ['Viviendas turísticas', ['apartamento', 'casa', 'finca', 'otra']],
          ['Agencias, guías y otros', ['servicios']],
        ];
        const ult = anios.at(-1);
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...d.fuente.corte.split('-')),
          chart: { kind: 'stacked', labels: anios, partialLast: true, series: grupos.map(([name, ts]) => ({ name, data: anios.map(y => ts.reduce((t, k) => t + (a[y][k] || 0), 0)) })) },
          note: `De ${num(sumaAnio(a[anios[0]]))} prestadores en ${anios[0]} a ${num(sumaAnio(a['2019']))} en 2019 y ${num(sumaAnio(a[ult]))} en ${ult}. El salto desde 2021 lo explican las viviendas turísticas (fincas, apartamentos y casas) que se inscribieron en el RNT. La barra de ${ult} (más clara) va hasta el 30 de septiembre.`,
          sourceText: citaRnt(d),
        };
      },
    },
    {
      type: 'chart',
      title: 'Hoteles, centros vacacionales y otros establecimientos',
      subtitle: 'Establecimientos de alojamiento con RNT activo, por año',
      async load() {
        const d = await rntHist();
        const a = porTipo(d.historico);
        const anios = Object.keys(a).sort();
        const t = ['hotel', 'centro', 'hostal', 'glamping'];
        const h = k => anios.map(y => a[y][k] || 0);
        const hot = h('hotel');
        const max = Math.max(...hot);
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...d.fuente.corte.split('-')),
          chart: { kind: 'line', labels: anios, series: t.map(k => ({ name: TIPOS.find(x => x[0] === k)[1], data: h(k) })) },
          note: `Hoteles: ${hot[0]} en ${anios[0]}, máximo de ${max} en ${anios[hot.indexOf(max)]} y ${hot.at(-1)} en ${anios.at(-1)}. Los apartahoteles pasaron de 17 en 2018 a 1: la mayoría se reclasificó como vivienda turística o salió del registro.`,
          sourceText: citaRnt(d),
        };
      },
    },
    {
      type: 'chart',
      title: 'Viviendas turísticas: apartamentos, casas y fincas',
      subtitle: 'Viviendas con RNT activo para alquiler turístico, por año',
      async load() {
        const d = await rntHist();
        const a = porTipo(d.historico);
        const anios = Object.keys(a).sort().filter(y => y >= '2017');
        const t = ['apartamento', 'casa', 'finca', 'otra'];
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...d.fuente.corte.split('-')),
          chart: { kind: 'line', labels: anios, series: t.map(k => ({ name: TIPOS.find(x => x[0] === k)[1], data: anios.map(y => a[y][k] || 0) })) },
          note: `Los apartamentos turísticos pasaron de ${a['2021'].apartamento || 0} en 2021 a ${a[anios.at(-1)].apartamento} en ${anios.at(-1)}. "Otras viviendas y hospedajes" incluye la categoría "otros tipos de hospedaje no permanente" de 2019–2022, que en 2023 se repartió entre fincas, casas y apartamentos. Antes de 2017 solo había entre 1 y 4 fincas registradas.`,
          sourceText: citaRnt(d),
        };
      },
    },
    {
      type: 'chart',
      title: 'Nuevas inscripciones en el RNT por año',
      subtitle: 'Prestadores que se registraron por primera vez, por tipo',
      wide: true,
      async load() {
        const d = await rntHist();
        const n = porTipo(d.nuevos);
        const anios = Object.keys(n).sort();
        const t = ['hotel', 'centro', 'hostal', 'glamping', 'apartamento', 'casa', 'finca', 'otra'];
        const ult = anios.at(-1);
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...d.fuente.corte.split('-')),
          chart: { kind: 'stacked', labels: anios, partialLast: true, series: [...t.map(k => ({ name: TIPOS.find(x => x[0] === k)[1], data: anios.map(y => n[y][k] || 0) })), { name: 'Agencias, guías y otros', data: anios.map(y => n[y].servicios || 0), muted: true }] },
          note: `El tablero registra inscripciones desde 2018 (ese primer año parece incompleto). En 2025 se inscribieron ${num(sumaAnio(n['2025']))} prestadores (${n['2025'].apartamento} apartamentos turísticos y ${n['2025'].hotel} hoteles); en ${ult}, ${num(sumaAnio(n[ult]))} hasta el 30 de septiembre.`,
          sourceText: citaRnt(d),
        };
      },
    },
    {
      type: 'chart',
      title: 'Entradas y salidas del registro',
      subtitle: 'Nuevas inscripciones frente a prestadores que dejaron el RNT (estimado)',
      wide: true,
      async load() {
        const d = await rntHist();
        const a = porTipo(d.historico);
        const n = porTipo(d.nuevos);
        // 2018 es el primer año del tablero de inscripciones y parece incompleto: se calcula desde 2019.
        const anios = Object.keys(n).sort().filter(y => y >= '2019' && a[y - 1]);
        // Salidas = activos del año anterior + nuevos del año − activos del año.
        const bajas = (y, k) => (k ? (a[y - 1][k] || 0) + (n[y][k] || 0) - (a[y][k] || 0) : sumaAnio(a[y - 1]) + sumaAnio(n[y]) - sumaAnio(a[y]));
        const filas = anios.flatMap(y => TIPOS.map(([k, nombre]) => ({ anio: y, tipo: nombre, activosPrev: a[y - 1][k] || 0, nuevos: n[y][k] || 0, bajas: bajas(y, k), activos: a[y][k] || 0 })).filter(f => f.activosPrev || f.nuevos || f.activos));
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...d.fuente.corte.split('-')),
          chart: { kind: 'bar', labels: anios, partialLast: true, series: [{ name: 'Nuevas inscripciones', data: anios.map(y => sumaAnio(n[y])) }, { name: 'Salidas del registro (estimadas)', data: anios.map(y => bajas(y)) }], footer: i => { const y = anios[i]; return `Activos: ${num(sumaAnio(a[y - 1]))} → ${num(sumaAnio(a[y]))} (${sumaAnio(a[y]) >= sumaAnio(a[y - 1]) ? '+' : ''}${num(sumaAnio(a[y]) - sumaAnio(a[y - 1]))}) · hoteles que salieron: ${bajas(y, 'hotel')}`; } },
          table: {
            columns: [
              { key: 'anio', label: 'Año' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'activosPrev', label: 'Activos año anterior', align: 'right', format: v => num(v) },
              { key: 'nuevos', label: 'Nuevos', align: 'right', format: v => num(v) },
              { key: 'bajas', label: 'Salidas (estimadas)', align: 'right', format: v => num(v) },
              { key: 'activos', label: 'Activos', align: 'right', format: v => num(v) },
            ],
            rows: filas,
          },
          note: `El tablero no publica las cancelaciones; las salidas se estiman como activos del año anterior + nuevos − activos del año. Hoteles que salieron del registro: ${anios.map(y => `${y}: ${bajas(y, 'hotel')}`).join(' · ')}. Valores negativos en la tabla por tipo indican reclasificaciones entre tipos o reactivaciones, no cierres. Use "Ver tabla" para el detalle por tipo.`,
          sourceText: citaRnt(d),
        };
      },
    },
    {
      type: 'chart',
      title: 'Capacidad registrada: habitaciones y camas, 2005–2021',
      subtitle: 'Suma declarada por los prestadores activos de cada año',
      async load() {
        const d = await rntHist();
        const hab = porTipo(d.historico, 4);
        const cam = porTipo(d.historico, 5);
        const anios = Object.keys(hab).sort().filter(y => sumaAnio(cam[y]) > 0);
        return {
          labelTitle: 'Año',
          asOf: ofYear(anios.at(-1)),
          chart: { kind: 'line', labels: anios, series: [{ name: 'Camas', data: anios.map(y => sumaAnio(cam[y])) }, { name: 'Habitaciones', data: anios.map(y => sumaAnio(hab[y])) }] },
          note: `El tablero histórico solo trae capacidad hasta ${anios.at(-1)}. La capacidad vigente está en la tarjeta "Oferta turística registrada" (registro de datos.gov.co). En 2021 los hoteles sumaban ${num(cam['2021'].hotel)} camas y los centros vacacionales ${num(cam['2021'].centro)}.`,
          sourceText: citaRnt(d),
        };
      },
    },
    {
      type: 'chart',
      title: 'Evolución del registro turístico (cortes mensuales)',
      subtitle: 'Prestadores activos y camas en cada copia mensual guardada del RNT',
      wide: true,
      sources: ['rnt'],
      sourceText: 'Copias mensuales del RNT guardadas por este sitio (scripts/snapshot.mjs → data/snapshots.json).',
      async load() {
        const res = await fetch('data/snapshots.json', { cache: 'no-cache' });
        if (!res.ok) return { empty: true, emptyText: 'Aún no hay cortes guardados. Ejecute scripts/snapshot.mjs.' };
        const snaps = (await res.json()).snapshots || [];
        const [mesTxt, anio] = (snaps.at(-1)?.rnt.corte || '').split(' ');
        const asOf = anio ? ofMonth(anio, mesNumero(mesTxt), { kind: 'snapshot' }) : false;
        if (snaps.length < 2) {
          const s = snaps[0];
          return { asOf, empty: true, emptyText: s ? `Hay 1 corte guardado (${s.mes}: ${num(s.rnt.prestadores)} prestadores, ${num(s.rnt.camas)} camas). La serie se dibuja desde el segundo mes.` : 'Aún no hay cortes guardados.' };
        }
        return {
          labelTitle: 'Mes',
          asOf,
          chart: { kind: 'line', labels: snaps.map(s => s.mes), timeline: snaps.map(s => periodo(s.mes)), series: [{ name: 'Prestadores activos', data: snaps.map(s => s.rnt.prestadores) }, { name: 'Camas', data: snaps.map(s => s.rnt.camas) }] },
        };
      },
    },
    { type: 'heading', title: 'Llegada de visitantes por carretera', text: 'Pasajeros despachados desde terminales de transporte con destino a Villeta (Superintendencia de Transporte). Es un indicador de demanda turística y de movilidad regional, no el total de visitantes.' },
    {
      type: 'chart',
      title: 'Pasajeros despachados hacia Villeta por año',
      subtitle: 'Suma de pasajeros en despachos con destino Villeta',
      async load({ q, M }) {
        const rows = await q('supertransporte', { $select: 'date_extract_y(fecha_despacho) as y, sum(pasajeros) as p, sum(despachos) as d', $where: `municipio_destino_ruta='${M.dane}'`, $group: 'y', $order: 'y' });
        const data = rows.filter(r => toNum(r.p) > 0);
        if (!data.length) return { empty: true };
        const labels = data.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y));
        return {
          labelTitle: 'Año',
          asOf: await corteSuper(q, M),
          chart: { kind: 'bar', labels, series: [{ name: 'Pasajeros', data: data.map(r => toNum(r.p)) }], yoy: true, partialLast: Number(data.at(-1).y) === THIS_YEAR },
          table: {
            columns: [{ key: 'y', label: 'Año' }, { key: 'p', label: 'Pasajeros', align: 'right', format: v => num(toNum(v)) }, { key: 'd', label: 'Despachos', align: 'right', format: v => num(toNum(v)) }],
            rows: data,
          },
          note: 'Años sin reporte completo de las terminales (p. ej. 2024) aparecen bajos por vacíos de la fuente, no necesariamente por menor demanda. * Año en curso.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Estacionalidad: pasajeros por mes, comparativo anual',
      subtitle: 'Cada línea es un año; permite comparar temporadas (festivos, vacaciones) año contra año',
      wide: true,
      async load({ q, M }) {
        const rows = await q('supertransporte', { $select: 'date_extract_y(fecha_despacho) as y, date_extract_m(fecha_despacho) as m, sum(pasajeros) as p', $where: `municipio_destino_ruta='${M.dane}'`, $group: 'y, m', $order: 'y, m' });
        const byYear = new Map();
        for (const r of rows) {
          if (!byYear.has(r.y)) byYear.set(r.y, Array(12).fill(null));
          byYear.get(r.y)[Number(r.m) - 1] = toNum(r.p);
        }
        // Solo años con al menos 6 meses con datos, últimos 5.
        const years = [...byYear.entries()].filter(([, arr]) => arr.filter(v => v > 0).length >= 6).slice(-5);
        if (!years.length) return { empty: true };
        const c = await corteSuper(q, M);
        return {
          labelTitle: 'Mes',
          asOf: c,
          chart: { kind: 'line', months12: true, labels: MESES_CORTOS, series: years.map(([y, arr]) => ({ name: y, data: arr })) },
          note: c && c.d < 28 ? `El último mes publicado (${mes(c.m)} ${c.y}) está incompleto: llega hasta el día ${c.d}.` : undefined,
        };
      },
    },
    {
      type: 'chart',
      title: 'Terminal de origen de los pasajeros',
      subtitle: 'Pasajeros acumulados con destino Villeta, por terminal',
      async load({ q, M }) {
        const rows = await q('supertransporte', { $select: 'terminal, sum(pasajeros) as p', $where: `municipio_destino_ruta='${M.dane}'`, $group: 'terminal', $order: 'p DESC' });
        const data = rows.filter(r => toNum(r.p) > 0);
        if (!data.length) return { empty: true };
        const [first] = await q('supertransporte', { $select: 'min(fecha_despacho) as a, max(fecha_despacho) as b', $where: `municipio_destino_ruta='${M.dane}'` });
        const a = new Date(first.a); const b = new Date(first.b);
        return {
          labelTitle: 'Terminal',
          asOf: await corteSuper(q, M),
          chart: { kind: 'hbar', labels: data.map(r => titleCase(r.terminal)), series: [{ name: 'Pasajeros', data: data.map(r => toNum(r.p)) }] },
          note: `Periodo cubierto: ${mes(a.getMonth() + 1)} ${a.getFullYear()} – ${mes(b.getMonth() + 1)} ${b.getFullYear()}.`,
        };
      },
    },
    {
      type: 'kpis',
      title: 'Variación interanual de pasajeros (año corrido)',
      subtitle: 'Mismo periodo, hasta el último día publicado, en el año del corte y el anterior',
      async load({ q, M }) {
        const c = await corteSuper(q, M);
        if (!c) return { empty: true };
        const rows = await q('supertransporte', { $select: 'date_extract_y(fecha_despacho) as y, sum(pasajeros) as p', $where: `municipio_destino_ruta='${M.dane}' and ${ytdWhere('fecha_despacho', c)}`, $group: 'y' });
        const s = y => toNum(rows.find(r => Number(r.y) === y)?.p) || 0;
        const a = s(c.y); const b = s(c.y - 1);
        return {
          asOf: c,
          kpis: [
            { label: `Pasajeros ${ytdLabel(c)} ${c.y}`, value: num(a), delta: change(a, b), goodWhen: 'up', deltaLabel: `vs mismo periodo ${c.y - 1}`, source: 'supertransporte' },
            { label: `Pasajeros ${ytdLabel(c)} ${c.y - 1}`, value: num(b), source: 'supertransporte' },
          ],
        };
      },
    },
  ],
};
