import { num, toNum, titleCase, cop, compact, change, mes, MESES_CORTOS } from '../format.js';
import { ofYear, ofQuarter, ofMonth } from '../freshness.js';
import { sui, citaSui, meses, prestador, aniosDe, SERVICIOS } from './sui.js';

const nivelIrca = v => (v == null ? '—' : v <= 5 ? 'Sin riesgo' : v <= 14 ? 'Riesgo bajo' : v <= 35 ? 'Riesgo medio' : v <= 80 ? 'Riesgo alto' : 'Inviable sanitariamente');

export default {
  id: 'servicios',
  title: 'Servicios públicos',
  intro: 'Prestadores de acueducto, alcantarillado y aseo inscritos ante la Superservicios, calidad del agua (IRCA), residuos sólidos, suscriptores por servicio y acueductos comunitarios (SUI), energía, gas, reclamaciones y conectividad a internet fijo. El detalle de la Empresa de Servicios Públicos de Villeta (agua no contabilizada, finanzas) está en la sección <a href="#/esp">ESP Villeta</a>.',
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

    { type: 'heading', title: 'Suscriptores por servicio y acueductos comunitarios', text: 'Datos comerciales que cada prestador reporta mes a mes al Sistema Único de Información (SUI) de la Superservicios: suscriptores, consumo facturado, valor facturado, subsidios y contribuciones. Además de la ESP Villeta, cuatro acueductos comunitarios de veredas y caseríos reportan al SUI.' },
    {
      type: 'kpis',
      title: 'Suscriptores por servicio (último mes reportado al SUI)',
      wide: true,
      async load() {
        const s = await sui();
        const desde = s.mensualDesde;
        const ultimoMes = arr => { let i = arr.length - 1; while (i >= 0 && arr[i] == null) i--; return i; };
        const tile = (label, arr, hint) => {
          const i = ultimoMes(arr);
          const p = meses(desde, i + 1)[i];
          return { label, value: num(arr[i]), delta: i >= 12 ? change(arr[i], arr[i - 12]) : null, goodWhen: 'up', deltaLabel: `vs ${MESES_CORTOS[p.m - 1]} ${p.y - 1}`, hint, asOf: ofMonth(p.y, p.m) };
        };
        const esp = k => prestador(s, 2154, k).mensual.suscriptores;
        return {
          asOf: false,
          kpis: [
            tile('Acueducto (ESP Villeta)', esp('acueducto'), 'Los 4 acueductos comunitarios suman unos 1.600 más (ver tabla)'),
            tile('Alcantarillado (ESP Villeta)', esp('alcantarillado')),
            tile('Aseo (ESP Villeta)', esp('aseo'), 'Último periodo cargado al SUI'),
            tile('Energía eléctrica', s.municipio.energia.mensual.suscriptores, 'Todas las comercializadoras; Enel atiende casi todos'),
            tile('Gas natural', s.municipio.gas_natural.mensual.suscriptores, 'El SUI no tiene periodos posteriores para Villeta'),
          ],
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'chart',
      title: 'Suscriptores por servicio, 2003–2026',
      subtitle: 'Promedio mensual de cada año, todos los prestadores',
      wide: true,
      async load() {
        const s = await sui();
        const suma = serv => {
          const ps = s.prestadores.filter(p => p.servicio === serv);
          return y => { const v = ps.map(p => p.anual[y]?.suscriptores).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
        };
        const series = [
          ['Acueducto', suma('acueducto')],
          ['Alcantarillado', suma('alcantarillado')],
          ['Aseo', suma('aseo')],
          ['Energía eléctrica', y => s.municipio.energia.anual[y]?.suscriptores ?? null],
          ['Gas natural', y => s.municipio.gas_natural.anual[y]?.suscriptores ?? null],
          ['Telefonía fija', y => s.municipio.telefonia.anual[y]?.suscriptores ?? null],
        ];
        const anios = aniosDe(...s.prestadores.map(p => p.anual), s.municipio.energia.anual);
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...s.hasta.split('-')),
          chart: { kind: 'line', labels: anios, series: series.map(([name, f]) => ({ name, data: anios.map(f), muted: name === 'Telefonía fija' })) },
          note: 'Acueducto y alcantarillado suman la ESP y los acueductos comunitarios; en 2019–2024 La Masata y Caserío El Puente reportaron menos de 20 suscriptores (dato inconsistente con su consumo), así que el total de esos años queda corto en 400 a 650 suscriptores. Energía antes de 2009 oscila por cambios de comercializador y facturación bimestral. La telefonía fija solo se reportó hasta 2009; el aseo hasta abril de 2024 y el gas natural hasta diciembre de 2022. 2026 promedia enero a septiembre.',
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'table',
      title: 'Acueductos y alcantarillados que reportan al SUI',
      subtitle: 'Último año reportado por cada prestador',
      wide: true,
      async load() {
        const s = await sui();
        const rows = s.prestadores.filter(p => p.servicio !== 'aseo').map(p => {
          const ys = Object.keys(p.anual).sort();
          const y = ys.filter(k => !p.anual[k].meses || p.anual[k].meses >= 11).at(-1) || ys.at(-1);
          const r = p.anual[y];
          const dudoso = r.suscriptores != null && r.suscriptores < 20 && (r.consumo || 0) > 5000;
          return {
            prestador: p.corto, servicio: SERVICIOS[p.servicio], periodo: `${p.desde.slice(0, 4)}–${p.hasta.slice(0, 4)}`, anio: r.meses ? `${y} (${r.meses} meses)` : y,
            suscriptores: r.suscriptores, consumo: r.consumo, facturacion: r.facturacion,
            m3: r.consumo && r.facturacion ? r.facturacion / r.consumo : null,
            porSusc: !dudoso && r.consumo && r.suscriptores ? r.consumo / r.suscriptores / (r.meses || 12) : null,
            nota: dudoso ? 'Suscriptores reportados inconsistentes con el consumo' : '',
          };
        });
        const nombres = [...new Map(s.prestadores.map(p => [p.id, `${p.corto}: ${p.nombre}`])).values()];
        return {
          asOf: ofYear(rows.map(r => r.anio.slice(0, 4)).sort().at(-1)),
          table: {
            columns: [
              { key: 'prestador', label: 'Prestador' },
              { key: 'servicio', label: 'Servicio' },
              { key: 'periodo', label: 'Reporta' },
              { key: 'anio', label: 'Año' },
              { key: 'suscriptores', label: 'Suscriptores', align: 'right', format: v => num(v) },
              { key: 'consumo', label: 'm³ facturados', align: 'right', format: v => num(v) },
              { key: 'facturacion', label: 'Facturación', align: 'right', format: v => cop(v) },
              { key: 'm3', label: '$ por m³', align: 'right', format: v => (v == null ? '—' : `$ ${num(v)}`) },
              { key: 'porSusc', label: 'm³ por suscriptor al mes', align: 'right', format: v => num(v, 1) },
              { key: 'nota', label: 'Observación' },
            ],
            rows,
          },
          note: `Último año con al menos 11 meses reportados. Facturación en pesos corrientes; "$ por m³" divide el valor facturado (cargo fijo incluido) entre los metros cúbicos facturados. Nombres completos: ${nombres.join(' · ')}.`,
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'chart',
      title: 'Suscriptores de los acueductos comunitarios',
      subtitle: 'Promedio mensual por año, servicio de acueducto',
      async load() {
        const s = await sui();
        const ps = s.prestadores.filter(p => p.servicio === 'acueducto' && p.id !== 2154);
        const anios = aniosDe(...ps.map(p => p.anual));
        // Descarta años que caen a menos del 60 % del máximo previo: son errores de reporte, no bajas reales.
        const serie = p => { let max = 0; return anios.map(y => { const v = p.anual[y]?.suscriptores; if (v == null || v < max * 0.6) return null; max = Math.max(max, v); return v; }); };
        return {
          labelTitle: 'Año',
          asOf: ofYear(anios.at(-1)),
          chart: { kind: 'line', labels: anios, series: ps.map(p => ({ name: p.corto, data: serie(p) })) },
          note: 'Se omiten los años en que La Masata (2019–2020 y 2022–2024) y Caserío El Puente (2022–2025) reportaron entre 3 y 92 suscriptores, menos del 60 % de su nivel previo: no cuadra con los 36.000 a 62.000 m³ que siguen facturando al año. Mave Bagazal y La Masata no tienen reportes después de 2024.',
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'chart',
      title: 'Valor facturado por metro cúbico de acueducto',
      subtitle: 'Facturación ÷ m³ facturados, último año completo de cada prestador',
      async load() {
        const s = await sui();
        const filas = s.prestadores.filter(p => p.servicio === 'acueducto').map(p => {
          const y = Object.keys(p.anual).filter(k => p.anual[k].consumo && (!p.anual[k].meses || p.anual[k].meses >= 11)).sort().filter(k => !(p.id === 2154 && k === '2024')).at(-1);
          const r = p.anual[y];
          return { nombre: `${p.corto} (${y})`, v: r.facturacion / r.consumo, y };
        }).sort((a, b) => b.v - a.v);
        return {
          labelTitle: 'Prestador',
          asOf: ofYear(filas.map(f => f.y).sort().at(-1)),
          chart: { kind: 'hbar', format: v => `$ ${num(v)}`, labels: filas.map(f => f.nombre), series: [{ name: 'Pesos por m³', data: filas.map(f => f.v) }] },
          note: 'Incluye cargo fijo y consumo, antes de subsidios. Para la ESP se usa 2025 porque 2024 está duplicado en el SUI. No es la tarifa oficial: las tarifas por estrato están en el sitio de cada prestador.',
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'chart',
      title: 'Facturación de los acueductos comunitarios',
      subtitle: 'Acueducto y alcantarillado por año (pesos corrientes)',
      async load() {
        const s = await sui();
        const ids = [...new Set(s.prestadores.filter(p => p.id !== 2154).map(p => p.id))];
        const grupos = ids.map(id => s.prestadores.filter(p => p.id === id));
        const anios = aniosDe(...grupos.flat().map(p => p.anual));
        return {
          labelTitle: 'Año',
          asOf: ofYear(anios.at(-1)),
          chart: { kind: 'line', format: 'cop', labels: anios, series: grupos.map(g => ({ name: g[0].corto, data: anios.map(y => { const v = g.map(p => p.anual[y]?.facturacion).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; }) })) },
          note: 'Es el valor facturado a los usuarios que cada asociación reporta al SUI. Los años con pocos meses reportados (Mave Bagazal 2018, Caserío El Puente 2021, La Masata 2022) salen bajos por eso.',
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'text',
      title: '¿Y los estados financieros y el IANC de los acueductos comunitarios?',
      wide: true,
      load: async () => ({ asOf: false, sourceText: citaSui(await sui()), html: '<p>No se encontraron publicados. Las asociaciones de usuarios cargan su información financiera y técnica (volumen producido, pérdidas) en módulos del SUI que no están en la bodega de datos pública, y no publican informes de control social en internet como sí lo hace la ESP Villeta. Sin el volumen de agua producida no se puede calcular su índice de agua no contabilizada: el SUI público solo trae lo facturado. Para obtenerlos se puede pedir la información a cada asociación o a la Superservicios mediante un derecho de petición.</p>' }),
    },

    { type: 'heading', title: 'Energía eléctrica y gas' },
    {
      type: 'chart',
      title: 'Suscriptores de energía eléctrica y gas natural, mes a mes',
      subtitle: 'Todos los comercializadores con usuarios en Villeta',
      wide: true,
      async load() {
        const s = await sui();
        const en = s.municipio.energia.mensual.suscriptores;
        const gas = s.municipio.gas_natural.mensual.suscriptores;
        const t = meses(s.mensualDesde, en.length);
        return {
          labelTitle: 'Mes',
          asOf: ofMonth(...s.municipio.energia.hasta.split('-')),
          chart: { kind: 'line', timeline: t, labels: t.map(p => `${mes(p.m)} ${p.y}`), series: [{ name: 'Energía eléctrica', data: en, color: 3 }, { name: 'Gas natural', data: t.map((_, i) => gas[i] ?? null), color: 4 }] },
          note: `Energía: ${num(en[0])} suscriptores en enero de 2019 y ${num(en.at(-1))} en ${mes(t.at(-1).m)} de ${t.at(-1).y}. El gas natural (Alcanos de Colombia) no tiene periodos posteriores a diciembre de 2022 en el SUI; su caída de septiembre de 2020 es un reporte incompleto.`,
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'chart',
      title: 'Energía eléctrica facturada en Villeta',
      subtitle: 'Kilovatios hora (kWh) facturados por año, todos los comercializadores',
      async load() {
        const s = await sui();
        const a = s.municipio.energia.anual;
        const anios = Object.keys(a).filter(y => y >= '2009').sort();
        return {
          labelTitle: 'Año',
          asOf: ofMonth(...s.municipio.energia.hasta.split('-')),
          chart: { kind: 'bar', format: 'compact', labels: anios, series: [{ name: 'kWh facturados', data: anios.map(y => a[y].consumo) }], partialLast: true },
          note: `En 2025 se facturaron ${compact(a['2025'].consumo)} kWh por ${cop(a['2025'].facturacion)}. La barra de 2026 (más clara) cubre enero a septiembre.`,
          sourceText: citaSui(s),
        };
      },
    },
    {
      type: 'table',
      title: 'Comercializadores de energía y gas con usuarios en Villeta',
      subtitle: 'Según los periodos reportados al SUI',
      async load() {
        const s = await sui();
        return {
          asOf: ofMonth(...s.hasta.split('-')),
          table: {
            columns: [
              { key: 'nombre', label: 'Empresa' },
              { key: 'servicio', label: 'Servicio', format: v => SERVICIOS[v] },
              { key: 'periodo', label: 'Periodos reportados' },
              { key: 'suscriptores', label: 'Suscriptores (último mes)', align: 'right', format: v => num(v) },
            ],
            rows: s.otros.map(o => ({ ...o, periodo: `${o.desde} a ${o.hasta}` })),
          },
          note: 'Las comercializadoras con 1 a 8 suscriptores atienden grandes consumidores (mercado no regulado). Codensa se fusionó con Emgesa en 2022 y hoy opera como Enel Colombia. Los distribuidores de GLP venden cilindros y no reportan suscriptores.',
          sourceText: citaSui(s),
        };
      },
    },
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
          chart: { kind: 'line', labels: keys, timeline: keys.map(k => { const [y, t] = k.split('-T'); return { y: Number(y), q: Number(t) }; }), series: [{ name: 'Accesos fijos', data: keys.map(k => m.get(k)) }] },
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
