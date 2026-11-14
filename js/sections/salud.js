import { num, pct, toNum, titleCase } from '../format.js';
import { ofMonth, ofDate, ofYear } from '../freshness.js';
import { sum, groupSum, topN } from './helpers.js';

const corteReps = async (q, M) => {
  const [r] = await q('reps', { $select: 'max(fecha_corte_reps) as c', $where: repsWhere(M) });
  return ofDate(r?.c);
};

const REGIMEN = { C: 'Contributivo', S: 'Subsidiado', E: 'Excepción y especiales', P: 'Especial' };
const repsWhere = M => `upper(municipiosededesc) like '%${M.nombre.toUpperCase()}%' and upper(departamentodededesc) like '%${M.departamento.toUpperCase()}%'`;
const adresWhere = M => `upper(mnc_nombre)='${M.nombre.toUpperCase()}' and upper(dpr_nombre)='${M.departamento.toUpperCase()}'`;

function cleanEpsName(raw) {
  const s = String(raw || '').replace(/\s*-CM$/i, '').trim().toUpperCase();
  if (s.includes('SANITAS')) return 'EPS Sanitas';
  if (s.includes('FAMISANAR')) return 'EPS Famisanar';
  if (s.includes('NUEVA EPS')) return 'Nueva EPS';
  if (s.includes('COMPENSAR')) return 'Compensar EPS';
  if (s.includes('SALUD TOTAL')) return 'Salud Total EPS';
  if (s.includes('FERROCARRILES')) return 'Ferrocarriles Nacionales';
  if (s.includes('SURA')) return 'EPS Sura';
  if (s.includes('COOSALUD')) return 'Coosalud EPS';
  if (s.includes('CAPITAL SALUD')) return 'Capital Salud EPS';
  return titleCase(s);
}

const ORDEN_EDAD = ['< 1', '1 a 5', '5 a 15', '15 a 19', '19 a 45', '45 a 50', '50 a 55', '55 a 60', '60 a 65', '65 a 70', '70 a 75', '> 75'];

export default {
  id: 'salud',
  title: 'Salud y vigilancia epidemiológica',
  intro: 'Aseguramiento en el Sistema General de Seguridad Social en Salud por régimen, EPS y grupo etario (MinSalud y BDUA – ADRES), red de prestadores habilitados (REPS) y vigilancia en salud pública en Villeta (SIVIGILA e INS). La calidad del agua para consumo humano (IRCA) se presenta en la sección de Servicios públicos.',
  blocks: [
    {
      type: 'heading',
      title: 'Aseguramiento y red de prestadores',
      text: 'Cobertura por régimen de afiliación, distribución de usuarios por Entidad Promotora de Salud (EPS) en la Base de Datos Única de Afiliados (BDUA – ADRES) y sedes de prestadores habilitadas en el municipio (REPS).',
    },
    {
      type: 'kpis',
      title: 'Afiliados al sistema de salud y vigilancia epidemiológica',
      wide: true,
      async load({ q, M }) {
        const [rows, siv, cov] = await Promise.all([
          q('afiliados', { $select: 'ano, mes, idregimen, sum(numpersonas) as n', $where: `codmunicipio='${M.dane}'`, $group: 'ano, mes, idregimen', $order: 'ano DESC, mes DESC' }),
          q('ins_sivigila', { $select: 'ano, sum(conteo::number) as n', $where: "upper(municipio_ocurrencia)='VILLETA' and upper(departamento_ocurrencia)='CUNDINAMARCA'", $group: 'ano' }),
          q('ins_covid', { $select: 'recuperado, count(*) as n', $where: `ciudad_municipio='${M.dane}'`, $group: 'recuperado' }),
        ]);
        if (!rows.length) return { empty: true };
        const { ano, mes } = rows[0];
        const last = rows.filter(r => r.ano === ano && r.mes === mes);
        const total = last.reduce((a, r) => a + toNum(r.n), 0);
        const totalSiv = sum(siv, r => r.n);
        const anoSiv = siv[0]?.ano;
        const totalCov = sum(cov, r => r.n);
        const fallCov = sum(cov.filter(r => /fallecido/i.test(r.recuperado)), r => r.n);
        return {
          asOf: ofMonth(ano, mes),
          kpis: [
            { label: 'Total afiliados SGSSS', value: num(total), hint: `Corte ${mes}/${ano}`, source: 'afiliados' },
            ...last.sort((a, b) => toNum(b.n) - toNum(a.n)).map(r => ({
              label: `Régimen ${REGIMEN[r.idregimen] || r.idregimen}`,
              value: num(toNum(r.n)),
              hint: `${num((toNum(r.n) / total) * 100, 1)} % del total municipal`,
              source: 'afiliados',
            })),
            {
              label: `Notificaciones SIVIGILA (${anoSiv || 'INS'})`,
              value: num(totalSiv),
              hint: 'Eventos de interés en salud pública en Villeta',
              source: 'ins_sivigila',
              asOf: ofYear(anoSiv),
            },
            {
              label: 'Casos históricos COVID-19',
              value: num(totalCov),
              hint: `${num(fallCov)} fallecidos registrados en la serie INS`,
              source: 'ins_covid',
              asOf: ofYear(2024, { closed: true }),
            },
          ],
          note: 'El corte general de MinSalud se complementa abajo con la desagregación por EPS y grupo etario de la BDUA (ADRES).',
        };
      },
    },
    {
      type: 'chart',
      title: 'Afiliados por EPS y régimen en Villeta (BDUA – ADRES)',
      subtitle: 'Distribución de afiliados activos por Entidad Promotora de Salud en los regímenes contributivo y subsidiado',
      async load({ q, M }) {
        const [contrib, subs] = await Promise.all([
          q('adres_contributivo', {
            $select: 'ent_nombre, sum(cantidad::number) as n',
            $where: adresWhere(M),
            $group: 'ent_nombre',
          }),
          q('adres_subsidiado', {
            $select: 'ent_nombre, sum(cantidad::number) as n',
            $where: adresWhere(M),
            $group: 'ent_nombre',
          }),
        ]);
        if (!contrib.length && !subs.length) return { empty: true };
        const mapC = groupSum(contrib, r => cleanEpsName(r.ent_nombre), r => r.n);
        const mapS = groupSum(subs, r => cleanEpsName(r.ent_nombre), r => r.n);
        const allEps = [...new Set([...mapC.keys(), ...mapS.keys()])]
          .sort((a, b) => ((mapC.get(b) || 0) + (mapS.get(b) || 0)) - ((mapC.get(a) || 0) + (mapS.get(a) || 0)));
        return {
          labelTitle: 'EPS',
          sources: ['adres_contributivo', 'adres_subsidiado'],
          chart: {
            kind: 'hstacked',
            labels: allEps,
            series: [
              { name: 'Contributivo', data: allEps.map(e => mapC.get(e) || 0) },
              { name: 'Subsidiado', data: allEps.map(e => mapS.get(e) || 0) },
            ],
          },
          note: 'Incluye afiliados propios de cada régimen y afiliados en movilidad entre regímenes (-CM) consolidados por entidad promotora.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Estructura de afiliados por grupo de edad y régimen (BDUA – ADRES)',
      subtitle: 'Personas afiliadas en Villeta según tramo etario y régimen de aseguramiento',
      async load({ q, M }) {
        const [contrib, subs] = await Promise.all([
          q('adres_contributivo', {
            $select: 'tps_grp_etr_id as e, sum(cantidad::number) as n',
            $where: adresWhere(M),
            $group: 'tps_grp_etr_id',
          }),
          q('adres_subsidiado', {
            $select: 'tps_grp_etr_id as e, sum(cantidad::number) as n',
            $where: adresWhere(M),
            $group: 'tps_grp_etr_id',
          }),
        ]);
        if (!contrib.length && !subs.length) return { empty: true };
        const mapC = groupSum(contrib, r => r.e, r => r.n);
        const mapS = groupSum(subs, r => r.e, r => r.n);
        const edades = ORDEN_EDAD.filter(e => mapC.has(e) || mapS.has(e));
        return {
          labelTitle: 'Grupo de edad (años)',
          sources: ['adres_contributivo', 'adres_subsidiado'],
          chart: {
            kind: 'bar',
            labels: edades,
            series: [
              { name: 'Contributivo', data: edades.map(e => mapC.get(e) || 0) },
              { name: 'Subsidiado', data: edades.map(e => mapS.get(e) || 0) },
            ],
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Sedes de prestadores de salud por clase y naturaleza',
      subtitle: 'Registro Especial de Prestadores de Servicios de Salud (REPS)',
      async load({ q, M }) {
        const rows = await q('reps', { $select: 'claseprestador as c, naturalezajuridica as n, count(*) as k', $where: repsWhere(M), $group: 'c, n' });
        if (!rows.length) return { empty: true };
        const clases = [...new Set(rows.map(r => r.c))];
        const nats = [...new Set(rows.map(r => r.n))];
        return {
          labelTitle: 'Clase de prestador',
          asOf: await corteReps(q, M),
          chart: { kind: 'hstacked', labels: clases, series: nats.map(n => ({ name: n, data: clases.map(c => toNum(rows.find(r => r.c === c && r.n === n)?.k) || 0) })) },
        };
      },
    },
    {
      type: 'table',
      title: 'Sedes de prestadores habilitadas en Villeta',
      subtitle: 'IPS, profesionales independientes y otras entidades con sede en el municipio',
      async load({ q, M }) {
        const rows = await q('reps', { $select: 'nombreprestador, nombresede, claseprestador, naturalezajuridica, fecha_corte_reps', $where: repsWhere(M), $order: 'claseprestador, nombreprestador', $limit: 500 });
        if (!rows.length) return { empty: true };
        const esPersona = r => /Profesional Independiente/i.test(r.claseprestador);
        return {
          asOf: ofDate(rows[0].fecha_corte_reps),
          table: {
            columns: [
              { key: 'nombre', label: 'Prestador / sede' },
              { key: 'claseprestador', label: 'Clase' },
              { key: 'naturalezajuridica', label: 'Naturaleza' },
            ],
            // Los profesionales independientes son personas naturales: se agregan sin mostrar el nombre.
            rows: rows.map(r => ({ ...r, nombre: esPersona(r) ? 'Profesional independiente' : titleCase(r.nombresede || r.nombreprestador) })),
          },
          note: 'Los nombres de profesionales independientes (personas naturales) no se muestran por protección de datos personales.',
        };
      },
    },

    {
      type: 'heading',
      title: 'Vigilancia en salud pública (SIVIGILA e INS)',
      text: 'Notificación de eventos de interés en salud pública ocurridos en Villeta según el Sistema Nacional de Vigilancia en Salud Pública (SIVIGILA) y registro histórico de la pandemia de COVID-19 del Instituto Nacional de Salud (INS).',
    },
    {
      type: 'chart',
      title: 'Eventos de interés en salud pública notificados en Villeta (SIVIGILA)',
      subtitle: 'Casos reportados por evento epidemiológico de ocurrencia en el municipio',
      async load({ q }) {
        const rows = await q('ins_sivigila', {
          $select: 'ano, nombre_evento, sum(conteo::number) as n',
          $where: "upper(municipio_ocurrencia)='VILLETA' and upper(departamento_ocurrencia)='CUNDINAMARCA'",
          $group: 'ano, nombre_evento',
          $order: 'n DESC',
        });
        if (!rows.length) return { empty: true };
        const ano = rows[0]?.ano;
        const entries = rows.map(r => [titleCase(r.nombre_evento), toNum(r.n) || 0]);
        const top = topN(entries, 12, 'Otros eventos notificados');
        const total = sum(rows, r => r.n) || 1;
        return {
          labelTitle: 'Evento epidemiológico',
          asOf: ofYear(ano),
          chart: {
            kind: 'hbar',
            labels: top.map(([k]) => k),
            series: [{ name: `Casos notificados (${ano})`, data: top.map(([, v]) => v) }],
          },
          table: {
            columns: [
              { key: 'ev', label: 'Evento de salud pública (SIVIGILA)' },
              { key: 'n', label: 'Casos notificados', format: 'num', align: 'right' },
              { key: 'pct', label: 'Participación', format: 'pct', align: 'right' },
            ],
            rows: rows.map(r => ({
              ev: titleCase(r.nombre_evento),
              n: toNum(r.n) || 0,
              pct: ((toNum(r.n) || 0) / total) * 100,
            })),
          },
          note: 'Incluye eventos transmisibles (dengue, leishmaniasis cutánea), zoonosis (agresiones por animales potencialmente transmisores de rabia, accidente ofídico), nutrición (desnutrición aguda en menores de 5 años) y violencias de interés en salud pública.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Casos históricos de COVID-19 en Villeta por año de notificación',
      subtitle: 'Serie histórica del Instituto Nacional de Salud (INS) según estado del caso',
      async load({ q, M }) {
        const rows = await q('ins_covid', {
          $select: 'substring(fecha_de_notificaci_n, 1, 4) as y, recuperado, count(*) as n',
          $where: `ciudad_municipio='${M.dane}'`,
          $group: 'y, recuperado',
          $order: 'y',
        });
        if (!rows.length) return { empty: true };
        const years = [...new Set(rows.map(r => r.y).filter(Boolean))].sort();
        const getVal = (y, pred) => sum(rows.filter(r => r.y === y && pred(String(r.recuperado || ''))), r => r.n);
        return {
          labelTitle: 'Año de notificación',
          asOf: ofYear(years.at(-1), { closed: true }),
          chart: {
            kind: 'stacked',
            labels: years.map(String),
            series: [
              { name: 'Recuperados', data: years.map(y => getVal(y, s => /recuperado/i.test(s))) },
              { name: 'Fallecidos por COVID-19', data: years.map(y => getVal(y, s => /fallecido/i.test(s))) },
              { name: 'Otros / fallecimiento no COVID', data: years.map(y => getVal(y, s => !/recuperado|fallecido/i.test(s))) },
            ],
          },
          note: `Total acumulado en Villeta: ${num(sum(rows, r => r.n))} casos confirmados (${pct((sum(rows.filter(r => /recuperado/i.test(r.recuperado)), r => r.n) / (sum(rows, r => r.n) || 1)) * 100, 1)} recuperados).`,
        };
      },
    },
  ],
};
