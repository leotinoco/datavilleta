import { num, toNum, fecha, titleCase, escapeHtml } from '../format.js';
import { discover, datasetUrl } from '../soda.js';
import { THIS_YEAR, topN, sum } from './helpers.js';
import { ofDate, ofYear } from '../freshness.js';

const UNGRD = ['ungrd_2019', 'ungrd_2020', 'ungrd_2023', 'ungrd_v2'];

async function emergencias(q, M) {
  const where = `upper(municipio) like '%${M.nombre.toUpperCase()}%' and upper(departamento) like '%${M.departamento.toUpperCase()}%'`;
  const parts = await Promise.all(UNGRD.map(k => q(k, { $select: 'fecha, evento', $where: where, $order: 'fecha', $limit: 1000 }).catch(() => [])));
  const seen = new Set();
  const out = [];
  for (const r of parts.flat()) {
    const key = `${r.fecha}|${r.evento}`;
    if (!r.fecha || seen.has(key)) continue;
    seen.add(key);
    out.push({ fecha: r.fecha, y: new Date(r.fecha).getFullYear(), evento: titleCase(String(r.evento).replace('INCENDIO DE COBERTURA VEGETAL', 'INCENDIO FORESTAL')) });
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export default {
  id: 'territorio',
  title: 'Territorio, clima, riesgo y ambiente',
  intro: 'Emergencias atendidas y reportadas a la UNGRD, histórico de quejas y afectaciones ambientales ante la Corporación Autónoma Regional de Cundinamarca (CAR), registros climáticos y red de estaciones del IDEAM en Villeta, y capas oficiales de amenaza, vulnerabilidad y riesgo en datos.gov.co. El uso del suelo según el catastro multipropósito está en la sección de Agro y tierra rural.',
  blocks: [
    {
      type: 'heading',
      title: 'Gestión del riesgo de desastres (UNGRD)',
      text: 'Eventos de emergencia ocurridos en jurisdicción de Villeta (incendios forestales, inundaciones, crecientes súbitas, movimientos en masa y vendavales) consolidados por la Unidad Nacional para la Gestión del Riesgo de Desastres.',
    },
    {
      type: 'chart',
      title: 'Emergencias reportadas a la UNGRD',
      subtitle: 'Eventos por año y tipo (años con datos abiertos: 2019, 2020, 2023 en adelante)',
      wide: true,
      async load({ q, M }) {
        const ev = await emergencias(q, M);
        if (!ev.length) return { empty: true };
        const years = [...new Set(ev.map(e => e.y))].sort();
        const counts = new Map();
        for (const e of ev) counts.set(e.evento, (counts.get(e.evento) || 0) + 1);
        const tipos = topN(counts.entries(), 5, 'Otros eventos').map(t => t[0]);
        const tipoDe = e => (tipos.includes(e.evento) ? e.evento : 'Otros eventos');
        return {
          labelTitle: 'Año',
          asOf: ofDate(ev[0].fecha),
          chart: {
            kind: 'stacked', partialLast: years.at(-1) === THIS_YEAR,
            labels: years.map(y => (y === THIS_YEAR ? `${y}*` : String(y))),
            series: tipos.map(t => ({ name: t, data: years.map(y => ev.filter(e => e.y === y && tipoDe(e) === t).length) })),
          },
          note: 'La UNGRD publica un conjunto distinto por periodo; 2021–2022 no están disponibles como datos abiertos. Los incendios de cobertura vegetal se agrupan como incendios forestales.',
        };
      },
    },
    {
      type: 'table',
      title: 'Detalle de emergencias atendidas',
      subtitle: 'Eventos más recientes primero',
      async load({ q, M }) {
        const ev = await emergencias(q, M);
        if (!ev.length) return { empty: true };
        return { asOf: ofDate(ev[0].fecha), table: { columns: [{ key: 'fecha', label: 'Fecha', format: v => fecha(v) }, { key: 'evento', label: 'Evento' }], rows: ev }, maxHeight: 420 };
      },
    },

    {
      type: 'heading',
      title: 'Quejas y conflictividad ambiental (CAR Cundinamarca)',
      text: 'Expedientes y quejas por presuntas afectaciones a los recursos naturales radicadas ante la Dirección Regional Gualivá de la Corporación Autónoma Regional de Cundinamarca (CAR) en el municipio de Villeta.',
    },
    {
      type: 'chart',
      title: 'Quejas ambientales radicadas en Villeta ante la CAR por año',
      subtitle: 'Histórico anual de actuaciones por presunta afectación ambiental (2009–presente)',
      async load({ q }) {
        const rows = await q('car_quejas', {
          $select: 'a_o, count(*) as n, max(fecha_radicaci_n) as u',
          $where: "upper(municipio) like '%VILLETA%'",
          $group: 'a_o',
          $order: 'a_o',
        });
        if (!rows.length) return { empty: true };
        const valid = rows.filter(r => /^\d{4}$/.test(String(r.a_o)));
        const lastDate = valid.map(r => r.u).filter(Boolean).sort().at(-1);
        const totalQ = sum(valid, r => r.n);
        return {
          labelTitle: 'Año de radicación',
          asOf: lastDate ? ofDate(lastDate) : ofYear(valid.at(-1)?.a_o),
          chart: {
            kind: 'bar',
            labels: valid.map(r => (Number(r.a_o) === THIS_YEAR ? `${r.a_o}*` : String(r.a_o))),
            partialLast: Number(valid.at(-1)?.a_o) === THIS_YEAR,
            series: [{ name: 'Quejas ambientales', data: valid.map(r => toNum(r.n) || 0) }],
            yoy: true,
          },
          note: `Total acumulado desde 2009: ${num(totalQ)} quejas ambientales en jurisdicción de Villeta.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Quejas ambientales en Villeta según recurso natural afectado',
      subtitle: 'Frecuencia con que cada recurso (agua, flora, suelo, aire, fauna) es reportado en las quejas ante la CAR',
      async load({ q }) {
        const rows = await q('car_quejas', {
          $select: 'agua, flora, suelo, aire, fauna, count(*) as n, max(fecha_radicaci_n) as u',
          $where: "upper(municipio) like '%VILLETA%'",
          $group: 'agua, flora, suelo, aire, fauna',
        });
        if (!rows.length) return { empty: true };
        const lastDate = rows.map(r => r.u).filter(Boolean).sort().at(-1);
        const recursos = [
          ['Flora (tala / aprovechamiento forestal)', sum(rows.filter(r => r.flora === 'X'), r => r.n)],
          ['Recurso hídrico (agua / rondas / vertimientos)', sum(rows.filter(r => r.agua === 'X'), r => r.n)],
          ['Suelo (movimiento de tierras / residuos)', sum(rows.filter(r => r.suelo === 'X'), r => r.n)],
          ['Aire (emisiones / quemas / olores / ruido)', sum(rows.filter(r => r.aire === 'X'), r => r.n)],
          ['Fauna silvestre', sum(rows.filter(r => r.fauna === 'X'), r => r.n)],
        ].sort((a, b) => b[1] - a[1]);
        return {
          labelTitle: 'Recurso natural afectado',
          asOf: lastDate ? ofDate(lastDate) : undefined,
          chart: {
            kind: 'hbar',
            labels: recursos.map(([k]) => k),
            series: [{ name: 'Quejas que involucran el recurso', data: recursos.map(([, v]) => v) }],
          },
          note: 'Una misma queja ambiental puede involucrar simultáneamente más de un recurso natural (por ejemplo, intervención de ronda hídrica con tala de cobertura vegetal).',
        };
      },
    },

    {
      type: 'heading',
      title: 'Clima y red hidrometeorológica (IDEAM)',
      text: 'Red de estaciones hidrometeorológicas instaladas por el IDEAM en la cuenca del río Tobia / río Negro en jurisdicción de Villeta y serie instrumental de temperatura ambiente.',
    },
    {
      type: 'chart',
      title: 'Temperatura media anual en la estación automática de Villeta (IDEAM)',
      subtitle: 'Promedio anual de las lecturas horarias del sensor de temperatura del aire a 2 m (°C)',
      async load({ q }) {
        const rows = await q('ideam_temperatura', {
          $select: 'date_extract_y(fechaobservacion) as y, count(*) as lecturas, avg(valorobservado::number) as t_media, max(valorobservado::number) as t_max, min(valorobservado::number) as t_min',
          $where: "upper(municipio)='VILLETA' and valorobservado::number between 10 and 42",
          $group: 'y',
          $order: 'y',
        });
        const valid = rows.filter(r => toNum(r.lecturas) >= 1000);
        if (!valid.length) return { empty: true };
        return {
          labelTitle: 'Año',
          asOf: ofYear(valid.at(-1)?.y),
          chart: {
            kind: 'line',
            format: 'dec',
            beginAtZero: false,
            labels: valid.map(r => String(r.y)),
            series: [
              { name: 'Temperatura media (°C)', data: valid.map(r => Number(toNum(r.t_media)?.toFixed(1))) },
            ],
          },
          note: 'Estación automática VILLETA - AUT (código 0023065180, zona hidrográfica Magdalena – Cauca). Se excluyen años con menos de 1.000 lecturas horarias válidas o valores fuera de rango.',
        };
      },
    },
    {
      type: 'table',
      title: 'Catálogo de estaciones hidrometeorológicas del IDEAM en Villeta',
      subtitle: 'Estaciones limnigráficas, pluviométricas, climatológicas y agrometeorológicas en el municipio',
      async load({ q }) {
        const rows = await q('ideam_estaciones', {
          $select: 'codigo, nombre, categoria, tecnologia, altitud, estado, fecha_instalacion',
          $where: "upper(municipio)='VILLETA'",
          $order: 'estado, categoria, nombre',
          $limit: 100,
        });
        if (!rows.length) return { empty: true };
        const activas = rows.filter(r => /activa/i.test(r.estado)).length;
        return {
          table: {
            columns: [
              { key: 'codigo', label: 'Código' },
              { key: 'nombre', label: 'Nombre de la estación' },
              { key: 'categoria', label: 'Categoría' },
              { key: 'tecnologia', label: 'Tecnología' },
              { key: 'altitud', label: 'Altitud (m s. n. m.)', align: 'right', format: v => num(toNum(v)) },
              { key: 'estado', label: 'Estado' },
            ],
            rows,
          },
          maxHeight: 420,
          note: `${num(rows.length)} estaciones registradas en jurisdicción de Villeta (${num(activas)} activas y ${num(rows.length - activas)} suspendidas/históricas).`,
        };
      },
    },

    {
      type: 'heading',
      title: 'Cartografía oficial y capas de amenaza y riesgo',
      text: 'Conjuntos geográficos y mapas publicados en el Portal de Datos Abiertos de Colombia para el municipio de Villeta.',
    },
    {
      type: 'table',
      title: 'Capas geográficas oficiales de Villeta',
      subtitle: 'Amenaza, vulnerabilidad y riesgo (incendio, inundación, avenida torrencial, remoción en masa), catastro y cartografía básica',
      wide: true,
      sourceText: 'Portal de Datos Abiertos de Colombia (datos.gov.co) – API de catálogo (Discovery API), búsqueda en vivo. Las entidades publicadoras se indican en cada fila.',
      async load({ M }) {
        const items = (await discover(M.nombre, 200)).filter(d => d.type === 'map' || d.type === 'dataset' || d.type === 'file');
        const relevantes = items.filter(d => /villeta|amenaza|riesgo|vulnerab|inundaci|incendio|remoci|torrenc|catastr|cartograf/i.test(`${d.name}`));
        if (!relevantes.length) return { empty: true };
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'name', label: 'Capa / conjunto', html: (v, r) => `<a href="${datasetUrl(r.id)}" target="_blank" rel="noopener">${escapeHtml(v)}</a>` },
              { key: 'attribution', label: 'Publicado por', format: v => v || 'Sin entidad declarada' },
              { key: 'updatedAt', label: 'Actualizado', format: v => fecha(v) },
              { key: 'id', label: 'ID' },
            ],
            rows: relevantes.sort((a, b) => a.name.localeCompare(b.name)),
          },
          maxHeight: 460,
          note: 'Listado generado en vivo con la API de catálogo de datos.gov.co (búsqueda "Villeta"). Varias capas no declaran entidad publicadora en el portal; revise el detalle de cada conjunto.',
        };
      },
    },
  ],
};
