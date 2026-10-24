import { toNum, titleCase, cop, num } from '../format.js';
import { THIS_YEAR, cleanLabel, corteFecha } from './helpers.js';
import { ofYear } from '../freshness.js';

const corteFinagro = (q, M) => corteFecha(q, 'finagro', 'fecha_credito', `cod_municipio=${M.dane}`);

export default {
  id: 'agro',
  title: 'Agro y ruralidad',
  intro: 'Producción agrícola municipal (con énfasis en la caña panelera, principal cultivo de Villeta), inventario bovino, crédito agropecuario de fomento y uso del suelo según el catastro.',
  blocks: [
    { type: 'heading', title: 'Caña panelera', text: 'Las Evaluaciones Agropecuarias Municipales cambiaron de metodología y de entidad responsable en 2019: hasta 2018 la producción se reporta en toneladas de <strong>panela</strong>; desde 2019, en toneladas de <strong>caña</strong>. Por eso las series se muestran por separado.' },
    {
      type: 'chart',
      title: 'Área sembrada de caña panelera',
      subtitle: 'Hectáreas por año en las dos series de la EVA',
      wide: true,
      async load({ q, M }) {
        const [hist, nuevo] = await Promise.all([
          q('eva_hist', { $select: 'a_o, sum(rea_sembrada_ha::number) as s', $where: `c_d_mun='${M.dane}' and upper(cultivo) like 'CA%A PANELERA'`, $group: 'a_o', $order: 'a_o' }),
          q('eva', { $select: 'a_o, sum(rea_sembrada::number) as s', $where: `c_digo_dane_municipio='${M.dane}' and desagregaci_n_cultivo='Caña panelera'`, $group: 'a_o', $order: 'a_o' }),
        ]);
        const years = [...new Set([...hist, ...nuevo].map(r => r.a_o))].sort();
        if (!years.length) return { empty: true };
        const val = (rows, y) => toNum(rows.find(r => r.a_o === y)?.s) ?? null;
        return {
          labelTitle: 'Año',
          chart: { kind: 'line', labels: years, series: [{ name: 'EVA 2007–2018 (MinAgricultura)', data: years.map(y => val(hist, y)) }, { name: 'EVA 2019+ (UPRA)', data: years.map(y => val(nuevo, y)) }] },
        };
      },
    },
    {
      type: 'chart',
      title: 'Producción de panela 2007–2018',
      subtitle: 'Toneladas de panela por año',
      async load({ q, M }) {
        const rows = await q('eva_hist', { $select: 'a_o, sum(producci_n_t::number) as p', $where: `c_d_mun='${M.dane}' and upper(cultivo) like 'CA%A PANELERA'`, $group: 'a_o', $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', asOf: ofYear(rows.at(-1).a_o, { closed: true }), chart: { kind: 'bar', labels: rows.map(r => r.a_o), series: [{ name: 'Producción (t de panela)', data: rows.map(r => toNum(r.p)) }], yoy: true } };
      },
    },
    {
      type: 'chart',
      title: 'Producción de caña panelera 2019 en adelante',
      subtitle: 'Toneladas de caña por año',
      async load({ q, M }) {
        const rows = await q('eva', { $select: 'a_o, sum(producci_n::number) as p, sum(rendimiento::number) as r', $where: `c_digo_dane_municipio='${M.dane}' and desagregaci_n_cultivo='Caña panelera'`, $group: 'a_o', $order: 'a_o' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Año', chart: { kind: 'bar', labels: rows.map(r => r.a_o), series: [{ name: 'Producción (t de caña)', data: rows.map(r => toNum(r.p)) }], yoy: true } };
      },
    },
    {
      type: 'chart',
      title: 'Otros cultivos: área sembrada',
      subtitle: 'Hectáreas por cultivo en el último año de la EVA (sin caña panelera)',
      async load({ q, M }) {
        const [last] = await q('eva', { $select: 'max(a_o) as y', $where: `c_digo_dane_municipio='${M.dane}'` });
        if (!last?.y) return { empty: true };
        const rows = await q('eva', { $select: 'cultivo, sum(rea_sembrada::number) as s, sum(producci_n::number) as p', $where: `c_digo_dane_municipio='${M.dane}' and a_o='${last.y}' and cultivo != 'Caña'`, $group: 'cultivo', $order: 's DESC' });
        return {
          labelTitle: 'Cultivo',
          asOf: ofYear(last.y),
          chart: { kind: 'hbar', format: 'dec', labels: rows.map(r => r.cultivo), series: [{ name: 'Área sembrada (ha)', data: rows.map(r => toNum(r.s)) }] },
          table: { columns: [{ key: 'cultivo', label: 'Cultivo' }, { key: 's', label: 'Área sembrada (ha)', align: 'right', format: v => num(toNum(v), 1) }, { key: 'p', label: 'Producción (t)', align: 'right', format: v => num(toNum(v), 1) }], rows },
          note: `Año ${last.y}.`,
        };
      },
    },
    { type: 'heading', title: 'Ganadería y crédito rural' },
    {
      type: 'chart',
      title: 'Inventario bovino',
      subtitle: 'Bovinos en predios de los ciclos de vacunación contra aftosa',
      async load({ q, M }) {
        const rows = await q('fng', { $select: 'vigencia, ciclo, total_bovinos_pm, total_predios_pm', $where: `upper(municipio)='${M.nombre.toUpperCase()}' and upper(departamento)='${M.departamento.toUpperCase()}'`, $order: 'vigencia, ciclo' });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Ciclo',
          asOf: ofYear(rows.at(-1).vigencia),
          chart: { kind: 'line', labels: rows.map(r => `${r.vigencia} ${r.ciclo.replace('Ciclo ', 'C-')}`), series: [{ name: 'Bovinos', data: rows.map(r => toNum(r.total_bovinos_pm)) }], beginAtZero: false },
          table: { columns: [{ key: 'vigencia', label: 'Vigencia' }, { key: 'ciclo', label: 'Ciclo' }, { key: 'total_bovinos_pm', label: 'Bovinos', align: 'right', format: v => num(toNum(v)) }, { key: 'total_predios_pm', label: 'Predios', align: 'right', format: v => num(toNum(v)) }], rows },
        };
      },
    },
    {
      type: 'chart',
      title: 'Crédito de fomento agropecuario (FINAGRO)',
      subtitle: 'Valor desembolsado por año',
      async load({ q, M }) {
        const rows = await q('finagro', { $select: 'date_extract_y(fecha_credito) as y, count(*) as n, sum(valor_credito) as v', $where: `cod_municipio=${M.dane}`, $group: 'y', $order: 'y' });
        if (!rows.length) return { empty: true };
        const partial = Number(rows.at(-1).y) === THIS_YEAR;
        return {
          labelTitle: 'Año',
          asOf: await corteFinagro(q, M),
          chart: { kind: 'bar', format: 'cop', labels: rows.map(r => (Number(r.y) === THIS_YEAR ? `${r.y}*` : r.y)), series: [{ name: 'Valor desembolsado', data: rows.map(r => toNum(r.v)) }], yoy: true, partialLast: partial },
          table: { columns: [{ key: 'y', label: 'Año' }, { key: 'n', label: 'Créditos', align: 'right', format: v => num(toNum(v)) }, { key: 'v', label: 'Valor (COP)', align: 'right', format: v => cop(toNum(v)) }], rows },
        };
      },
    },
    {
      type: 'chart',
      title: 'Créditos FINAGRO por cadena productiva',
      subtitle: 'Valor desembolsado acumulado desde 2020',
      async load({ q, M }) {
        const rows = await q('finagro', { $select: 'cadena, count(*) as n, sum(valor_credito) as v', $where: `cod_municipio=${M.dane}`, $group: 'cadena', $order: 'v DESC', $limit: 12 });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Cadena', asOf: await corteFinagro(q, M), chart: { kind: 'hbar', format: 'cop', labels: rows.map(r => titleCase(r.cadena || 'Sin cadena')), series: [{ name: 'Valor desembolsado', data: rows.map(r => toNum(r.v)) }] } };
      },
    },
    { type: 'heading', title: 'Uso del suelo según el catastro' },
    {
      type: 'chart',
      title: 'Predios por destino económico',
      subtitle: 'Número de predios por destino y sector (urbano, rural, corregimiento)',
      wide: true,
      async load({ q }) {
        const rows = await q('catastro', { $select: 'dest_econo as d, sector as s, count(*) as n', $group: 'd, s', $limit: 500 });
        if (!rows.length) return { empty: true };
        const tot = new Map();
        for (const r of rows) tot.set(r.d, (tot.get(r.d) || 0) + toNum(r.n));
        const dest = [...tot.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
        const sectors = [...new Set(rows.map(r => r.s))];
        return {
          labelTitle: 'Destino económico',
          chart: { kind: 'hstacked', labels: dest.map(cleanLabel), series: sectors.map(s => ({ name: titleCase(s === 'CORREGIM' ? 'Corregimiento' : s), data: dest.map(d => toNum(rows.find(r => r.d === d && r.s === s)?.n) || 0) })) },
          note: 'Base catastral publicada por la Agencia Catastral de Cundinamarca (gestor catastral del municipio).',
        };
      },
    },
  ],
};
