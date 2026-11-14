import { toNum, titleCase, cop, num, pct } from '../format.js';
import { THIS_YEAR, cleanLabel, corteFecha, sum, groupSum } from './helpers.js';
import { ofYear } from '../freshness.js';

const corteFinagro = (q, M) => corteFecha(q, 'finagro', 'fecha_credito', `cod_municipio=${M.dane}`);

// Códigos DANE de los 12 municipios de la Provincia del Gualivá (Cundinamarca).
const GUALIVA_DANE = ['25019', '25320', '25398', '25402', '25489', '25491', '25592', '25658', '25718', '25777', '25851', '25875'];

export default {
  id: 'agro',
  title: 'Agro, uso del suelo y tierra rural',
  intro: 'Producción agrícola municipal (con énfasis en la caña panelera, cultivo insignia de Villeta), inventario bovino, crédito agropecuario de fomento (FINAGRO) por tipo de productor y sexo, uso del suelo según el catastro multipropósito e índice de informalidad en la tenencia de la tierra rural (UPRA).',
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
    {
      type: 'chart',
      title: 'Crédito agropecuario por tamaño de productor y sexo',
      subtitle: 'Número de operaciones de crédito FINAGRO en Villeta según tipo de productor y género del beneficiario',
      async load({ q, M }) {
        const rows = await q('finagro', {
          $select: 'tipo_productor, sexo, count(*) as n, sum(valor_credito) as v, sum(valor_subsidio) as s',
          $where: `cod_municipio=${M.dane}`,
          $group: 'tipo_productor, sexo',
        });
        if (!rows.length) return { empty: true };
        const normProd = p => {
          const s = String(p || '').toLowerCase();
          if (s.includes('ppib') || s.includes('ingresos bajos')) return 'Pequeño productor de ingresos bajos';
          if (s.includes('peque')) return 'Pequeño productor';
          if (s.includes('mediano')) return 'Mediano productor';
          if (s.includes('grande')) return 'Gran productor';
          return titleCase(p || 'Otro');
        };
        const tipos = ['Pequeño productor', 'Pequeño productor de ingresos bajos', 'Mediano productor', 'Gran productor'];
        const sexos = [
          ['Mujer', 'Mujeres rurales'],
          ['Hombre', 'Hombres'],
          ['Sociedad', 'Personas jurídicas / sociedades'],
        ];
        const totalSub = sum(rows, r => r.s);
        return {
          labelTitle: 'Tipo de productor',
          asOf: await corteFinagro(q, M),
          chart: {
            kind: 'hstacked',
            labels: tipos,
            series: sexos.map(([raw, label]) => ({
              name: label,
              data: tipos.map(t => sum(rows.filter(r => normProd(r.tipo_productor) === t && String(r.sexo || '').toLowerCase().includes(raw.toLowerCase())), r => r.n)),
            })),
          },
          note: `Total de operaciones desde 2020: ${num(sum(rows, r => r.n))} créditos (${num(sum(rows.filter(r => /mujer/i.test(r.sexo)), r => r.n))} otorgados a mujeres rurales) con subsidios de tasa e incentivos por ${cop(totalSub)}.`,
        };
      },
    },

    {
      type: 'heading',
      title: 'Uso del suelo según el catastro',
      text: 'Distribución de los predios y del área catastral de Villeta según la Agencia Catastral de Cundinamarca, y estimación de la informalidad en la tenencia de la tierra rural realizada por la Unidad de Planificación Rural Agropecuaria (UPRA).',
    },
    {
      type: 'chart',
      title: 'Predios por destino económico y sector',
      subtitle: 'Número de matrículas catastrales por destino (urbano, rural y corregimientos)',
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
    {
      type: 'chart',
      title: 'Superficie catastral por destino económico (hectáreas)',
      subtitle: 'Área física total (ha) de los predios de Villeta según su uso económico y sector',
      async load({ q }) {
        const rows = await q('catastro', {
          $select: 'dest_econo as d, sector as s, sum(area_geom) as area, count(*) as n',
          $group: 'd, s',
          $limit: 500,
        });
        if (!rows.length) return { empty: true };
        const mapHa = groupSum(rows, r => cleanLabel(r.d), r => (toNum(r.area) || 0) / 10000);
        const dest = [...mapHa.entries()].filter(([, v]) => v >= 1).sort((a, b) => b[1] - a[1]);
        return {
          labelTitle: 'Destino económico',
          chart: {
            kind: 'hbar',
            format: 'dec',
            labels: dest.map(([k]) => k),
            series: [{ name: 'Superficie (ha)', data: dest.map(([, v]) => Number(v.toFixed(1))) }],
          },
          note: 'Mientras que los predios habitacionales representan la mayoría de las matrículas urbanas, los predios agropecuarios, recreacionales y de uso público concentran la mayor parte de la superficie del municipio.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Índice de informalidad en la tenencia de la tierra rural (UPRA)',
      subtitle: 'Porcentaje estimado de predios rurales con presunta informalidad en los municipios de la Provincia del Gualivá',
      scope: { nivel: 'Comparación provincial (Gualivá)', texto: 'compara el índice municipal de Villeta con los otros 11 municipios de la Provincia del Gualivá en Cundinamarca.' },
      wide: true,
      async load({ q, M }) {
        const rows = await q('upra_informalidad', {
          $select: 'cod_dane_m, municipio, area_ha, informalid',
          $where: `cod_dane_m in (${GUALIVA_DANE.map(c => `'${c}'`).join(',')})`,
          $order: 'informalid::number DESC',
        });
        if (!rows.length) return { empty: true };
        const vil = rows.find(r => r.cod_dane_m === M.dane);
        return {
          labelTitle: 'Municipio (Provincia del Gualivá)',
          chart: {
            kind: 'hbar',
            format: 'pct',
            labels: rows.map(r => (r.cod_dane_m === M.dane ? `${r.municipio} (municipio analizado)` : r.municipio)),
            series: [{ name: 'Informalidad en la tenencia (%)', data: rows.map(r => Number(((toNum(r.informalid) || 0) * 100).toFixed(2))) }],
          },
          table: {
            columns: [
              { key: 'm', label: 'Municipio' },
              { key: 'inf', label: 'Índice de informalidad', align: 'right', format: v => pct(v, 2) },
              { key: 'ha', label: 'Área rural evaluada (ha)', align: 'right', format: v => num(v, 1) },
            ],
            rows: rows.map(r => ({
              m: r.municipio,
              inf: (toNum(r.informalid) || 0) * 100,
              ha: toNum(r.area_ha) || 0,
            })),
          },
          note: vil ? `En Villeta el índice de informalidad de tenencia de la tierra rural calculado por la UPRA es del ${pct((toNum(vil.informalid) || 0) * 100, 2)} sobre un área evaluada de ${num(toNum(vil.area_ha), 1)} hectáreas.` : undefined,
        };
      },
    },
  ],
};
