import { num, toNum, change, mes, MESES_CORTOS, titleCase } from '../format.js';
import { THIS_YEAR, corteRnt, corteFecha, ytdWhere, ytdLabel } from './helpers.js';
import { ofMonth, mesNumero } from '../freshness.js';

const corteSuper = (q, M) => corteFecha(q, 'supertransporte', 'fecha_despacho', `municipio_destino_ruta='${M.dane}'`);

const RNT = M => `cod_mun='${M.dane}'`;

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
          note: 'El conjunto del RNT publica solo el registro vigente (una fotografía del mes de corte). Para seguir su evolución, el repositorio incluye un script que guarda una copia mensual (ver sección Fuentes).',
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
          chart: { kind: 'line', labels: snaps.map(s => s.mes), series: [{ name: 'Prestadores activos', data: snaps.map(s => s.rnt.prestadores) }, { name: 'Camas', data: snaps.map(s => s.rnt.camas) }] },
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
          chart: { kind: 'line', labels: MESES_CORTOS, series: years.map(([y, arr]) => ({ name: y, data: arr })) },
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
