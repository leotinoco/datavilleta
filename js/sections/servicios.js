import { num, toNum, titleCase } from '../format.js';
import { ofYear, ofQuarter } from '../freshness.js';

const nivelIrca = v => (v == null ? '—' : v <= 5 ? 'Sin riesgo' : v <= 14 ? 'Riesgo bajo' : v <= 35 ? 'Riesgo medio' : v <= 80 ? 'Riesgo alto' : 'Inviable sanitariamente');

export default {
  id: 'servicios',
  title: 'Servicios públicos',
  intro: 'Prestadores de acueducto, alcantarillado y aseo inscritos ante la Superservicios, calidad del agua (IRCA), residuos sólidos, reclamaciones de energía y conectividad a internet fijo.',
  blocks: [
    { type: 'heading', title: 'Acueducto, alcantarillado y aseo' },
    {
      type: 'table',
      title: 'Prestadores de servicios públicos en Villeta',
      subtitle: 'Registro Único de Prestadores (RUPS) – Superservicios',
      wide: true,
      async load({ q, M }) {
        const rows = await q('rups', { $select: 'nombre, servicio, estado, tipo_prestador, clasificacion', $where: `upper(municipio_prestacion) like '%${M.nombre.toUpperCase()}%' and upper(departamento_prestacion) like '%${M.departamento.toUpperCase()}%'`, $order: 'nombre, servicio' });
        if (!rows.length) return { empty: true };
        return {
          table: {
            columns: [
              { key: 'nombre', label: 'Prestador', format: v => titleCase(v) },
              { key: 'servicio', label: 'Servicio', format: v => titleCase(v) },
              { key: 'tipo_prestador', label: 'Tipo de prestador', format: v => titleCase(v) },
              { key: 'clasificacion', label: 'Tamaño', format: v => titleCase(v) },
              { key: 'estado', label: 'Estado', format: v => titleCase(v) },
            ],
            rows,
          },
          note: 'El RUPS publicado en datos.gov.co tiene corte de 2021; para información más reciente consulte el SUI de la Superservicios.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Calidad del agua para consumo humano (IRCA)',
      subtitle: 'Índice de Riesgo de la Calidad del Agua por año: 0 = mejor, 100 = peor',
      wide: true,
      async load({ q, M }) {
        const rows = await q('ins_irca', { $select: 'a_o, irca, ircaurbano, ircarural', $where: `municipiocodigo='${M.dane}'`, $order: 'a_o' });
        if (!rows.length) return { empty: true };
        const v = x => toNum(x);
        return {
          labelTitle: 'Año',
          asOf: ofYear(rows.at(-1).a_o),
          chart: {
            kind: 'line', format: 'dec', labels: rows.map(r => r.a_o),
            series: [
              { name: 'IRCA municipal', data: rows.map(r => v(r.irca)) },
              { name: 'Zona urbana', data: rows.map(r => v(r.ircaurbano)) },
              { name: 'Zona rural', data: rows.map(r => v(r.ircarural)) },
            ],
            threshold: { value: 5, label: 'Límite "sin riesgo" (5)' },
          },
          table: {
            columns: [
              { key: 'a_o', label: 'Año' },
              { key: 'irca', label: 'IRCA municipal', align: 'right', format: x => num(v(x), 1) },
              { key: 'nivel', label: 'Nivel de riesgo' },
              { key: 'ircaurbano', label: 'Urbano', align: 'right', format: x => num(v(x), 1) },
              { key: 'ircarural', label: 'Rural', align: 'right', format: x => num(v(x), 1) },
            ],
            rows: rows.map(r => ({ ...r, nivel: nivelIrca(v(r.irca)) })),
          },
          note: 'Clasificación (Res. 2115 de 2007): 0–5 sin riesgo · 5,1–14 bajo · 14,1–35 medio · 35,1–80 alto · 80,1–100 inviable sanitariamente. "ND" (sin dato) en zona rural aparece como vacío.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Residuos sólidos llevados a disposición final',
      subtitle: 'Toneladas por año reportadas por el prestador de aseo',
      async load({ q, M }) {
        const rows = await q('sspd_residuos', { $where: `upper(municipio_rea_de_prestaci) like '%${M.nombre.toUpperCase()}%'`, $order: 'a_o_del_cargue', $limit: 500 });
        if (!rows.length) return { empty: true };
        const years = [...new Set(rows.map(r => r.a_o_del_cargue))].sort();
        const s = (y, f) => rows.filter(r => r.a_o_del_cargue === y).reduce((a, r) => a + (toNum(r[f]) || 0), 0);
        return {
          labelTitle: 'Año',
          asOf: ofYear(years.at(-1)),
          chart: {
            kind: 'stacked', labels: years,
            series: [
              { name: 'Residuos no aprovechables', data: years.map(y => s(y, 'toneladas_de_residuos_no')) },
              { name: 'Barrido y limpieza', data: years.map(y => s(y, 'toneladas_de_barrido_y') + s(y, 'toneladas_de_limpieza_urbana')) },
            ],
          },
          note: `Prestador: ${titleCase(rows[0].nombre_empresa)}.`,
        };
      },
    },
    { type: 'heading', title: 'Energía eléctrica' },
    {
      type: 'chart',
      title: 'Reclamaciones y quejas de energía',
      subtitle: 'Peticiones, quejas y reclamos radicados por usuarios de Villeta, por año y empresa',
      async load({ q, M }) {
        const rows = await q('sspd_pqr_energia', { $select: 'car_carg_ano as y, are_esp_nombre as e, count(*) as n', $where: `dane_cod_depto=${M.daneDepto} and dane_cod_mpio=${M.daneMpio3}`, $group: 'y, e', $order: 'y' });
        if (!rows.length) return { empty: true };
        const norm = e => (/ENEL|CODENSA/i.test(e) ? 'Enel Colombia (antes Codensa)' : 'Otras comercializadoras');
        const years = [...new Set(rows.map(r => r.y))].sort();
        const empresas = [...new Set(rows.map(r => norm(r.e)))];
        return {
          labelTitle: 'Año',
          asOf: ofYear(years.at(-1)),
          chart: { kind: 'stacked', labels: years, series: empresas.map(e => ({ name: e, data: years.map(y => rows.filter(r => r.y === y && norm(r.e) === e).reduce((a, r) => a + toNum(r.n), 0)) })) },
          note: 'El conjunto abierto cubre los años cargados por la Superservicios (actualmente 2021–2022).',
        };
      },
    },
    { type: 'heading', title: 'Conectividad' },
    {
      type: 'chart',
      title: 'Accesos fijos a internet',
      subtitle: 'Número de accesos (conexiones) por trimestre',
      wide: true,
      async load({ q, M }) {
        const [hist, nuevo] = await Promise.all([
          q('mintic_internet_hist', { $select: 'anno, trimestre, sum(no_de_accesos::number) as n', $where: `cod_municipio='${M.dane}'`, $group: 'anno, trimestre', $order: 'anno, trimestre' }),
          q('mintic_internet', { $select: 'anno, trimestre, sum(accesos_fijos_internet) as n', $where: `codigo_dane_municipio=${M.dane}`, $group: 'anno, trimestre', $order: 'anno, trimestre' }),
        ]);
        const m = new Map();
        for (const r of [...hist, ...nuevo]) m.set(`${r.anno}-T${r.trimestre}`, toNum(r.n));
        const keys = [...m.keys()].sort();
        if (!keys.length) return { empty: true };
        const [ya, tr] = keys.at(-1).split('-T');
        return {
          labelTitle: 'Trimestre',
          asOf: ofQuarter(ya, tr),
          chart: { kind: 'line', labels: keys, series: [{ name: 'Accesos fijos', data: keys.map(k => m.get(k)) }], yoy: false },
          note: 'Se combinan dos conjuntos de MinTIC: el histórico (2017–2023 T3) y el vigente (desde 2023 T4). El primer trimestre de 2017 está incompleto en la fuente.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Accesos fijos por tecnología',
      subtitle: 'Último trimestre publicado',
      async load({ q, M }) {
        const [last] = await q('mintic_internet', { $select: 'max(anno) as a', $where: `codigo_dane_municipio=${M.dane}` });
        if (!last?.a) return { empty: true };
        const [lt] = await q('mintic_internet', { $select: 'max(trimestre) as t', $where: `codigo_dane_municipio=${M.dane} and anno=${last.a}` });
        const rows = await q('mintic_internet', { $select: 'tecnologia, sum(accesos_fijos_internet) as n', $where: `codigo_dane_municipio=${M.dane} and anno=${last.a} and trimestre=${lt.t}`, $group: 'tecnologia', $order: 'n DESC' });
        return {
          labelTitle: 'Tecnología',
          asOf: ofQuarter(last.a, lt.t),
          chart: { kind: 'hbar', labels: rows.map(r => r.tecnologia), series: [{ name: 'Accesos', data: rows.map(r => toNum(r.n)) }] },
          note: `Periodo: ${last.a} T${lt.t}.`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Accesos fijos por proveedor',
      subtitle: 'Último trimestre publicado',
      async load({ q, M }) {
        const [last] = await q('mintic_internet', { $select: 'max(anno) as a', $where: `codigo_dane_municipio=${M.dane}` });
        if (!last?.a) return { empty: true };
        const [lt] = await q('mintic_internet', { $select: 'max(trimestre) as t', $where: `codigo_dane_municipio=${M.dane} and anno=${last.a}` });
        const rows = await q('mintic_internet', { $select: 'proveedor, sum(accesos_fijos_internet) as n', $where: `codigo_dane_municipio=${M.dane} and anno=${last.a} and trimestre=${lt.t}`, $group: 'proveedor', $order: 'n DESC' });
        const top = rows.slice(0, 10);
        return {
          labelTitle: 'Proveedor',
          asOf: ofQuarter(last.a, lt.t),
          chart: { kind: 'hbar', labels: top.map(r => titleCase(r.proveedor)), series: [{ name: 'Accesos', data: top.map(r => toNum(r.n)) }] },
          note: `Periodo: ${last.a} T${lt.t}.${rows.length > 10 ? ` Se muestran los 10 principales de ${rows.length} proveedores.` : ''}`,
        };
      },
    },
  ],
};
