import { DELITOS } from '../sources.js';
import { num, toNum, change, signedPct, mes, MESES_CORTOS, fecha, titleCase } from '../format.js';
import { THIS_YEAR, sum, groupSum, topN } from './helpers.js';
import { ofDate, ofYear } from '../freshness.js';

// Serie mensual completa de un delito para Villeta (una sola consulta por delito, reutilizada por todas las tarjetas).
const monthly = (q, M, d) => q(`delito_${d.key}`, {
  $select: 'date_extract_y(fecha_hecho) as y, date_extract_m(fecha_hecho) as m, sum(cantidad) as n',
  $where: `cod_muni='${M.dane}'`, $group: 'y, m', $order: 'y, m', $limit: 2000,
});

// Fecha de corte de la publicación (último hecho registrado a nivel nacional).
async function cutoff(q) {
  const [r] = await q('delito_hurto_personas', { $select: 'max(fecha_hecho) as m' });
  const d = new Date(r.m);
  let y = d.getFullYear();
  let m = d.getDate() >= 28 ? d.getMonth() + 1 : d.getMonth();
  if (m === 0) { y -= 1; m = 12; }
  return { date: d, y, m };
}

const total = (rows, y, upToMonth = 12) => rows.filter(r => Number(r.y) === y && Number(r.m) <= upToMonth).reduce((a, r) => a + toNum(r.n), 0);

function deltaHtml(v) {
  if (v == null || !Number.isFinite(v)) return '<span class="muted">—</span>';
  if (v === 0) return '<span class="delta neutral">● 0 %</span>';
  const up = v > 0;
  return `<span class="delta ${up ? 'bad' : 'good'}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${signedPct(v)}</span>`;
}

const smallMultiple = d => ({
  type: 'chart',
  title: d.nombre,
  subtitle: 'Casos por año',
  sources: [`delito_${d.key}`],
  async load({ q, M, filters }) {
    const [rows, cut] = await Promise.all([monthly(q, M, d), cutoff(q)]);
    const from = Number(filters.desde);
    const years = [];
    for (let y = from; y <= THIS_YEAR; y++) years.push(y);
    const data = years.map(y => total(rows, y));
    if (!data.some(v => v > 0)) return { empty: true, emptyText: `Sin casos registrados en ${M.nombre} desde ${from}.` };
    return {
      labelTitle: 'Año',
      asOf: ofDate(cut.date),
      chart: { kind: 'bar', height: 220, labels: years.map(y => (y === THIS_YEAR ? `${y}*` : String(y))), series: [{ name: d.nombre, data }], yoy: true, partialLast: true },
    };
  },
});

const CONTEXTO_VIF = {
  '1 Lesiones no Fatales contra la Pareja': 'Contra la pareja o expareja',
  '2 Lesiones no Fatales contra el Adulto Mayor por Violencia Intrafamiliar': 'Contra el adulto mayor',
  '3 Lesiones no Fatales contra Niños, Niñas y Adolescentes por Violencia Intrafamiliar': 'Contra niños, niñas y adolescentes',
  '4 Lesiones no Fatales por Violencia entre otros Familiares': 'Entre otros familiares',
};

export default {
  id: 'seguridad',
  title: 'Seguridad, justicia forense y convivencia',
  intro: 'Delitos y conductas registradas por la Policía Nacional (SIEDCO – Ministerio de Defensa), dictámenes médico-legales de lesiones fatales y no fatales del Instituto Nacional de Medicina Legal, siniestralidad vial (Ministerio de Transporte) y medidas correctivas del Código Nacional de Seguridad y Convivencia Ciudadana (Ley 1801).',
  filters: [
    { id: 'desde', label: 'Serie histórica desde', default: '2010', options: [{ value: '2003', label: '2003' }, { value: '2010', label: '2010' }, { value: '2016', label: '2016' }, { value: String(THIS_YEAR - 5), label: String(THIS_YEAR - 5) }] },
    { id: 'delito', label: 'Delito para el comparativo mensual', default: 'hurto_personas', options: DELITOS.map(d => ({ value: d.key, label: d.nombre })) },
  ],
  blocks: [
    { type: 'heading', title: 'Año corrido', text: 'Delitos registrados desde el 1 de enero hasta el último día publicado, frente al mismo periodo del año anterior.' },
    {
      type: 'table',
      title: 'Comparativo año corrido',
      subtitle: 'Casos registrados en Villeta: mismo periodo del año actual frente al anterior',
      wide: true,
      sources: ['delito_hurto_personas'],
      async load({ q, M }) {
        const cut = await cutoff(q);
        const series = await Promise.all(DELITOS.map(d => monthly(q, M, d).then(rows => ({ d, rows }))));
        const per = `ene–${mes(cut.m)}`;
        const rows = series.map(({ d, rows: r }) => {
          const cur = total(r, cut.y, cut.m);
          const prev = total(r, cut.y - 1, cut.m);
          return { delito: d.nombre, prev, cur, var: change(cur, prev), full1: total(r, cut.y - 1), full2: total(r, cut.y - 2) };
        });
        return {
          table: {
            columns: [
              { key: 'delito', label: 'Delito' },
              { key: 'prev', label: `${per} ${cut.y - 1}`, align: 'right', format: v => num(v) },
              { key: 'cur', label: `${per} ${cut.y}`, align: 'right', format: v => num(v) },
              { key: 'var', label: 'Variación', align: 'right', html: v => deltaHtml(v) },
              { key: 'full1', label: `Año ${cut.y - 1}`, align: 'right', format: v => num(v) },
              { key: 'full2', label: `Año ${cut.y - 2}`, align: 'right', format: v => num(v) },
            ],
            rows,
          },
          maxHeight: 720,
          asOf: ofDate(cut.date),
          note: `Datos con corte al ${fecha(cut.date)} (último hecho publicado). Variación ▲ = aumento de casos (desfavorable); ▼ = disminución. Con conteos bajos, las variaciones porcentuales son muy sensibles: lea también los valores absolutos. Fuentes: un conjunto de datos del Ministerio de Defensa por cada delito (ver enlaces en cada gráfico).`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Comparativo mensual del delito seleccionado',
      subtitle: 'Casos por mes en los últimos tres años (cambie el delito en el filtro superior)',
      wide: true,
      async load({ q, M, filters }) {
        const d = DELITOS.find(x => x.key === filters.delito) || DELITOS[0];
        const rows = await monthly(q, M, d);
        const cut = await cutoff(q);
        const years = [cut.y - 2, cut.y - 1, cut.y];
        return {
          labelTitle: 'Mes',
          asOf: ofDate(cut.date),
          chart: {
            kind: 'line', months12: true, labels: MESES_CORTOS,
            series: years.map(y => ({
              name: `${y}`,
              data: MESES_CORTOS.map((_, i) => (y === cut.y && i + 1 > cut.m ? null : total(rows.filter(r => Number(r.m) === i + 1), y))),
            })),
          },
          note: `${d.nombre}. El año ${cut.y} llega hasta ${mes(cut.m)}. Los picos de un solo mes pueden deberse a eventos puntuales (p. ej. un fin de semana de festividades con alta afluencia de visitantes); la consulta API permite revisar el detalle por día.`,
        };
      },
    },
    { type: 'heading', title: 'Serie histórica por delito', text: 'Barras por año desde el año elegido en el filtro. La barra atenuada (*) es el año en curso, con datos parciales. Los saltos alrededor de 2016 coinciden con cambios en el sistema de registro de denuncias: compare con cautela antes y después de ese año.' },
    ...DELITOS.map(smallMultiple),
    { type: 'heading', title: 'Detalle por modalidad' },
    {
      type: 'chart',
      title: 'Homicidios según arma o medio empleado',
      subtitle: 'Casos acumulados desde el año del filtro según el arma o medio reportado por MinDefensa',
      async load({ q, M, filters }) {
        const rows = await q('delito_homicidio', {
          $select: 'arma_medio, sum(cantidad) as n',
          $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01' and arma_medio is not null`,
          $group: 'arma_medio',
          $order: 'n DESC',
        });
        if (!rows.length) return { empty: true };
        const cut = await cutoff(q);
        const entries = topN(rows.map(r => [titleCase(r.arma_medio), toNum(r.n) || 0]), 8, 'Otros medios');
        return {
          labelTitle: 'Arma o medio',
          asOf: ofDate(cut.date),
          chart: { kind: 'hbar', labels: entries.map(([k]) => k), series: [{ name: 'Homicidios', data: entries.map(([, v]) => v) }] },
        };
      },
    },
    {
      type: 'chart',
      title: 'Hurto a vehículos por tipo',
      subtitle: 'Casos por año según el tipo de vehículo',
      async load({ q, M, filters }) {
        const rows = await q('delito_hurto_vehiculos', { $select: 'date_extract_y(fecha_hecho) as y, tipo_delito as t, sum(cantidad) as n', $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01'`, $group: 'y, t', $order: 'y' });
        if (!rows.length) return { empty: true };
        const cut = await cutoff(q);
        const years = [...new Set(rows.map(r => Number(r.y)))].sort();
        const tipos = [...new Set(rows.map(r => r.t))];
        return {
          labelTitle: 'Año',
          asOf: ofDate(cut.date),
          chart: {
            kind: 'stacked', partialLast: years.at(-1) === THIS_YEAR,
            labels: years.map(y => (y === THIS_YEAR ? `${y}*` : String(y))),
            series: tipos.map(t => ({ name: titleCase(t), data: years.map(y => toNum(rows.find(r => Number(r.y) === y && r.t === t)?.n) || 0) })),
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Delitos contra el medio ambiente por conducta',
      subtitle: 'Casos acumulados desde el año del filtro',
      async load({ q, M, filters }) {
        const rows = await q('delito_ambiente', { $select: 'descripcion_conducta as c, sum(cantidad) as n', $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01'`, $group: 'c', $order: 'n DESC' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Conducta', asOf: ofDate((await cutoff(q)).date), chart: { kind: 'hbar', labels: rows.map(r => titleCase(r.c)), series: [{ name: 'Casos', data: rows.map(r => toNum(r.n)) }] } };
      },
    },
    {
      type: 'chart',
      title: 'Delitos informáticos por conducta',
      subtitle: 'Casos acumulados desde el año del filtro',
      async load({ q, M, filters }) {
        const rows = await q('delito_informaticos', { $select: 'descripcion_conducta as c, sum(cantidad) as n', $where: `cod_muni='${M.dane}' and fecha_hecho >= '${filters.desde}-01-01'`, $group: 'c', $order: 'n DESC' });
        if (!rows.length) return { empty: true };
        return { labelTitle: 'Conducta', asOf: ofDate((await cutoff(q)).date), chart: { kind: 'hbar', labels: rows.map(r => titleCase(r.c)), series: [{ name: 'Casos', data: rows.map(r => toNum(r.n)) }] } };
      },
    },

    {
      type: 'heading',
      title: 'Medicina Legal y ciencias forenses',
      text: 'Valoraciones médico-legales y necropsias realizadas por el Instituto Nacional de Medicina Legal y Ciencias Forenses por hechos ocurridos en el municipio de Villeta.',
    },
    {
      type: 'chart',
      title: 'Violencia intrafamiliar según contexto (Medicina Legal)',
      subtitle: 'Valoraciones médico-legales por lesiones no fatales intrafamiliares en Villeta por año',
      async load({ q, M }) {
        const rows = await q('medlegal_vif', {
          $select: 'a_o_del_hecho as y, contexto_del_hecho as c, count(*) as n',
          $where: `codigo_dane_municipio='${M.dane}'`,
          $group: 'y, c',
          $order: 'y',
        });
        if (!rows.length) return { empty: true };
        const years = [...new Set(rows.map(r => r.y))].sort();
        const contextos = [...new Set(rows.map(r => r.c))];
        return {
          labelTitle: 'Año del hecho',
          asOf: ofYear(years.at(-1)),
          chart: {
            kind: 'stacked',
            labels: years,
            series: contextos.map(c => ({
              name: CONTEXTO_VIF[c] || titleCase(c),
              data: years.map(y => toNum(rows.find(r => r.y === y && r.c === c)?.n) || 0),
            })),
          },
          note: 'A diferencia de las denuncias ante la Policía Nacional, este registro recoge los casos en los que la víctima asistió a valoración médico-legal forense.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Homicidios y suicidios forenses en Villeta (Medicina Legal)',
      subtitle: 'Necropsias médico-legales practicadas por hechos ocurridos en el municipio',
      async load({ q, M }) {
        const [hom, sui, fat] = await Promise.all([
          q('medlegal_homicidios', {
            $select: 'a_o_del_hecho as y, count(*) as n',
            $where: `codigo_dane_municipio='${M.dane}'`,
            $group: 'y',
            $order: 'y',
          }),
          q('medlegal_suicidios', {
            $select: 'a_o_del_hecho as y, count(*) as n',
            $where: `codigo_dane_municipio='${M.dane}'`,
            $group: 'y',
            $order: 'y',
          }),
          q('medlegal_fatales', {
            $select: 'a_o_del_hecho as y, manera_de_muerte as m, count(*) as n',
            $where: `codigo_dane_municipio='${M.dane}'`,
            $group: 'y, m',
            $order: 'y',
          }),
        ]);
        const mapH = new Map(hom.map(r => [String(r.y), toNum(r.n) || 0]));
        const mapS = new Map(sui.map(r => [String(r.y), toNum(r.n) || 0]));
        for (const r of fat) {
          const y = String(r.y);
          if (/homicidio/i.test(r.m) && !mapH.has(y)) mapH.set(y, toNum(r.n) || 0);
          if (/suicidio/i.test(r.m) && !mapS.has(y)) mapS.set(y, toNum(r.n) || 0);
        }
        const years = [...new Set([...mapH.keys(), ...mapS.keys()])].sort();
        if (!years.length) return { empty: true };
        return {
          labelTitle: 'Año del hecho',
          sources: ['medlegal_homicidios', 'medlegal_suicidios', 'medlegal_fatales'],
          asOf: ofYear(years.at(-1)),
          chart: {
            kind: 'bar',
            labels: years.map(y => (Number(y) === THIS_YEAR ? `${y}*` : y)),
            partialLast: Number(years.at(-1)) === THIS_YEAR,
            series: [
              { name: 'Presuntos homicidios', data: years.map(y => mapH.get(y) || 0) },
              { name: 'Presuntos suicidios', data: years.map(y => mapS.get(y) || 0) },
            ],
          },
          note: 'Integra la serie consolidada 2015–2024 y las cifras preliminares de lesiones fatales de causa externa para 2025 y el año en curso.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Personas reportadas como desaparecidas en Villeta (SIRDEC)',
      subtitle: 'Casos registrados en el Sistema de Información Red de Desaparecidos y Cadáveres según estado actual',
      async load({ q, M }) {
        const rows = await q('medlegal_desaparecidos', {
          $select: 'a_o_de_la_desaparicion as y, estado_de_la_desaparicion as e, count(*) as n',
          $where: `codigo_dane_municipio='${M.dane}'`,
          $group: 'y, e',
          $order: 'y',
        });
        if (!rows.length) return { empty: true };
        const years = [...new Set(rows.map(r => r.y))].sort();
        const estados = [...new Set(rows.map(r => r.e))];
        return {
          labelTitle: 'Año de desaparición',
          asOf: ofYear(years.at(-1)),
          chart: {
            kind: 'stacked',
            labels: years,
            series: estados.map(e => ({
              name: titleCase(e),
              data: years.map(y => toNum(rows.find(r => r.y === y && r.e === e)?.n) || 0),
            })),
          },
          note: `Total histórico reportado en Villeta: ${num(sum(rows, r => r.n))} casos (${num(sum(rows.filter(r => /vivo/i.test(r.e)), r => r.n))} aparecieron vivos, ${num(sum(rows.filter(r => /desaparecido/i.test(r.e)), r => r.n))} continúan desaparecidos y ${num(sum(rows.filter(r => /muerto/i.test(r.e)), r => r.n))} aparecieron fallecidos).`,
        };
      },
    },
    {
      type: 'chart',
      title: 'Lesiones fatales de causa externa recientes por manera de muerte',
      subtitle: 'Cifras preliminares 2025–2026 del Instituto Nacional de Medicina Legal en Villeta',
      async load({ q, M }) {
        const rows = await q('medlegal_fatales', {
          $select: 'a_o_del_hecho as y, manera_de_muerte as m, count(*) as n',
          $where: `codigo_dane_municipio='${M.dane}'`,
          $group: 'y, m',
          $order: 'y, n DESC',
        });
        if (!rows.length) return { empty: true };
        const cleanM = s => titleCase(String(s || '').replace(/^\d+\s*/, ''));
        const maneras = [...new Set(rows.map(r => cleanM(r.m)))];
        const years = [...new Set(rows.map(r => r.y))].sort();
        return {
          labelTitle: 'Manera de muerte',
          asOf: ofYear(years.at(-1)),
          chart: {
            kind: 'bar',
            labels: maneras,
            series: years.map(y => ({
              name: Number(y) === THIS_YEAR ? `${y}*` : String(y),
              data: maneras.map(m => sum(rows.filter(r => r.y === y && cleanM(r.m) === m), r => r.n)),
            })),
          },
        };
      },
    },

    {
      type: 'heading',
      title: 'Siniestralidad vial y convivencia ciudadana',
      text: 'Vehículos involucrados en siniestros viales en jurisdicción de Villeta (Ministerio de Transporte) y medidas correctivas aplicadas por la Policía Nacional bajo el Código Nacional de Seguridad y Convivencia Ciudadana (Ley 1801 de 2016).',
    },
    {
      type: 'chart',
      title: 'Vehículos involucrados en accidentes de tránsito en Villeta por clase y gravedad',
      subtitle: 'Registro nacional de siniestralidad vial del Ministerio de Transporte en el municipio',
      async load({ q }) {
        const rows = await q('mintransporte_accidentes', {
          $select: 'tipo_vehiculo, gravedad_accidente, count(*) as n',
          $where: "upper(municipio_accidente)='VILLETA'",
          $group: 'tipo_vehiculo, gravedad_accidente',
          $order: 'n DESC',
        });
        if (!rows.length) return { empty: true };
        const mapT = groupSum(rows, r => titleCase(r.tipo_vehiculo || 'Sin especificar'), r => r.n);
        const tipos = [...mapT.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k]) => k);
        const gravs = [...new Set(rows.map(r => r.gravedad_accidente))];
        return {
          labelTitle: 'Clase de vehículo',
          chart: {
            kind: 'hstacked',
            labels: tipos,
            series: gravs.map(g => ({
              name: titleCase(g),
              data: tipos.map(t => sum(rows.filter(r => titleCase(r.tipo_vehiculo || 'Sin especificar') === t && r.gravedad_accidente === g), r => r.n)),
            })),
          },
          note: 'Las motocicletas y los vehículos de carga (camiones y tractocamiones que transitan por el corredor vial) concentran la mayor participación en siniestros con lesionados y fallecidos.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Comportamientos contrarios a la convivencia en Villeta (Ley 1801)',
      subtitle: 'Artículos del Código Nacional de Seguridad y Convivencia Ciudadana con mayor número de medidas correctivas',
      async load({ q }) {
        const [art, med] = await Promise.all([
          q('policia_convivencia', {
            $select: 'articulo, count(*) as n',
            $where: "upper(lugar) like '%VILLETA%'",
            $group: 'articulo',
            $order: 'n DESC',
          }),
          q('policia_comparendos', {
            $select: 'vigencia, medida_se_alada_del_codigo as m, sum(total::number) as n',
            $where: "upper(municipio)='VILLETA'",
            $group: 'vigencia, m',
            $order: 'n DESC',
          }),
        ]);
        if (!art.length && !med.length) return { empty: true };
        const vig = med[0]?.vigencia;
        const items = art.length
          ? art.slice(0, 8).map(r => ({ label: r.articulo, val: toNum(r.n) || 0 }))
          : med.slice(0, 8).map(r => ({ label: r.m, val: toNum(r.n) || 0 }));
        return {
          labelTitle: 'Artículo / comportamiento',
          sources: ['policia_convivencia', 'policia_comparendos'],
          asOf: vig ? ofYear(vig) : undefined,
          chart: {
            kind: 'hbar',
            labels: items.map(x => x.label),
            series: [{ name: 'Medidas registradas', data: items.map(x => x.val) }],
          },
          note: 'El Art. 27 (comportamientos que ponen en riesgo la vida e integridad, como riñas o porte de armas blancas) y el Art. 140 (cuidado e integridad del espacio público) concentran la mayoría de las actuaciones.',
        };
      },
    },
  ],
};
