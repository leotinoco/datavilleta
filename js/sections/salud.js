import { num, toNum, titleCase } from '../format.js';
import { ofMonth, ofDate } from '../freshness.js';

const corteReps = async (q, M) => {
  const [r] = await q('reps', { $select: 'max(fecha_corte_reps) as c', $where: repsWhere(M) });
  return ofDate(r?.c);
};

const REGIMEN = { C: 'Contributivo', S: 'Subsidiado', E: 'Excepción y especiales', P: 'Especial' };
const repsWhere = M => `upper(municipiosededesc) like '%${M.nombre.toUpperCase()}%' and upper(departamentodededesc) like '%${M.departamento.toUpperCase()}%'`;

export default {
  id: 'salud',
  title: 'Salud',
  intro: 'Red de prestadores de servicios de salud habilitados en el municipio (REPS) y afiliación al Sistema General de Seguridad Social en Salud. La calidad del agua (IRCA, INS) está en la sección de Servicios públicos.',
  blocks: [
    {
      type: 'kpis',
      title: 'Afiliados al sistema de salud por régimen',
      wide: true,
      async load({ q, M }) {
        const rows = await q('afiliados', { $select: 'ano, mes, idregimen, sum(numpersonas) as n', $where: `codmunicipio='${M.dane}'`, $group: 'ano, mes, idregimen', $order: 'ano DESC, mes DESC' });
        if (!rows.length) return { empty: true };
        const { ano, mes } = rows[0];
        const last = rows.filter(r => r.ano === ano && r.mes === mes);
        const total = last.reduce((a, r) => a + toNum(r.n), 0);
        return {
          asOf: ofMonth(ano, mes),
          kpis: [
            { label: 'Total afiliados', value: num(total), hint: `Corte ${mes}/${ano}`, source: 'afiliados' },
            ...last.sort((a, b) => toNum(b.n) - toNum(a.n)).map(r => ({ label: `Régimen ${REGIMEN[r.idregimen] || r.idregimen}`, value: num(toNum(r.n)), hint: `${num((toNum(r.n) / total) * 100, 1)} % del total`, source: 'afiliados' })),
          ],
          note: 'El conjunto abierto de MinSalud contiene un solo corte; para series mensuales consulte la BDUA en el portal de ADRES.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Sedes de prestadores de salud por clase y naturaleza',
      subtitle: 'Registro Especial de Prestadores (REPS)',
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
          note: `Los nombres de profesionales independientes (personas naturales) no se muestran.`,
        };
      },
    },
  ],
};
