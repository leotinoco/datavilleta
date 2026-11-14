import { num, pct, cop, toNum, titleCase } from '../format.js';
import { ofYear, ofDate } from '../freshness.js';
import { sum } from './helpers.js';

const GRUPOS_SISBEN = {
  A: 'Grupo A · Pobreza extrema',
  B: 'Grupo B · Pobreza moderada',
  C: 'Grupo C · Vulnerabilidad',
  D: 'Grupo D · No pobre ni vulnerable',
};

const ZONAS_SISBEN = {
  '1': 'Cabecera municipal',
  '2': 'Centros poblados y rural disperso',
};

export default {
  id: 'social',
  title: 'Población, Sisbén y protección social',
  intro: 'Clasificación socioeconómica en la base certificada del Sisbén IV (DNP), programas de transferencias monetarias de Prosperidad Social, atención a la primera infancia del ICBF (Centro Zonal Villeta), protección a la vejez en Colpensiones y directorio de Juntas de Acción Comunal (IDACO).',
  blocks: [
    {
      type: 'kpis',
      title: 'Indicadores de focalización social, vejez y organización comunitaria',
      wide: true,
      async load({ q, M }) {
        const [sisben, fam, cm, colpAf, colpPen, jac] = await Promise.all([
          q('sisben', {
            $select: 'grupo, corte, count(*) as fichas, sum(fex::number) as pob',
            $where: `cod_mpio='${M.dane}'`,
            $group: 'grupo, corte',
          }),
          q('dps_familias', {
            $select: 'estadobeneficiario, sum(cantidaddebeneficiarios::number) as n',
            $where: `codigomunicipioatencion='${M.dane}'`,
            $group: 'estadobeneficiario',
          }),
          q('dps_colombia_mayor', {
            $select: 'cupos_colombia_mayor_2021, asignaci_n_presupuestal_total, corte',
            $where: `c_digo_dane='${M.dane}'`,
            $limit: 1,
          }),
          q('colpensiones_afiliados', {
            $select: 'genero, sum(cantidad::number) as n',
            $where: "upper(departamento)='CUNDINAMARCA' and upper(municipio)='VILLETA'",
            $group: 'genero',
          }),
          q('colpensiones_pensionados', {
            $select: 'sum(cantidad::number) as n',
            $where: "upper(departamento)='CUNDINAMARCA' and upper(municipio)='VILLETA'",
          }),
          q('idaco_jac', {
            $select: 'tipo_de_organismo, count(*) as n, max(fecha) as u',
            $where: "upper(municipio)='VILLETA'",
            $group: 'tipo_de_organismo',
          }),
        ]);

        const totalSisben = Math.round(sum(sisben, r => r.pob));
        const fichasSisben = sum(sisben, r => r.fichas);
        const pobA = Math.round(sum(sisben.filter(r => r.grupo === 'A'), r => r.pob));
        const pobB = Math.round(sum(sisben.filter(r => r.grupo === 'B'), r => r.pob));
        const pobAB = pobA + pobB;
        const pctAB = totalSisben ? (pobAB / totalSisben) * 100 : null;
        const corteSisben = ofYear(sisben[0]?.corte?.replace('SIV_', ''));

        const famActivos = sum(fam.filter(r => r.estadobeneficiario === 'ACTIVO'), r => r.n);
        const famTotal = sum(fam, r => r.n);

        const cmRow = cm[0] || {};
        const cuposCm = toNum(cmRow.cupos_colombia_mayor_2021) || 0;
        const asigCm = toNum(cmRow.asignaci_n_presupuestal_total) || 0;

        const totalAfColp = sum(colpAf, r => r.n);
        const totalPenColp = toNum(colpPen[0]?.n) || 0;

        const totalJac = sum(jac, r => r.n);
        const jacComunal = toNum(jac.find(r => r.tipo_de_organismo?.includes('ACCION COMUNAL'))?.n) || 0;
        const jacVivienda = toNum(jac.find(r => r.tipo_de_organismo?.includes('VIVIENDA'))?.n) || 0;

        return {
          asOf: ofDate(jac[0]?.u),
          kpis: [
            {
              label: 'Personas en Sisbén IV (expandido)',
              value: num(totalSisben),
              hint: `${num(fichasSisben)} registros muestrales en el municipio`,
              source: 'sisben',
              asOf: corteSisben,
            },
            {
              label: 'Pobreza en Sisbén (Grupos A y B)',
              value: pctAB != null ? pct(pctAB, 1) : '—',
              hint: `${num(pobA)} en pobreza extrema (A) y ${num(pobB)} en moderada (B)`,
              source: 'sisben',
              asOf: corteSisben,
            },
            {
              label: 'Más Familias en Acción (activos)',
              value: num(famActivos),
              hint: `De ${num(famTotal)} beneficiarios inscritos en Villeta`,
              source: 'dps_familias',
            },
            {
              label: 'Cupos Colombia Mayor',
              value: num(cuposCm),
              hint: `Asignación anual: ${cop(asigCm)}`,
              source: 'dps_colombia_mayor',
              asOf: ofDate(cmRow.corte),
            },
            {
              label: 'Colpensiones (afiliados / pensionados)',
              value: `${num(totalAfColp)} / ${num(totalPenColp)}`,
              hint: `${num(totalAfColp)} afiliados activos · ${num(totalPenColp)} pensionados`,
              source: 'colpensiones_afiliados',
            },
            {
              label: 'Organizaciones comunales (IDACO)',
              value: num(totalJac),
              hint: `${num(jacComunal)} Juntas de Acción Comunal y ${num(jacVivienda)} de Vivienda`,
              source: 'idaco_jac',
              asOf: ofDate(jac[0]?.u),
            },
          ],
        };
      },
    },

    {
      type: 'heading',
      title: 'Clasificación socioeconómica (Sisbén IV)',
      text: 'El Sisbén IV clasifica a la población en cuatro grupos según su capacidad de generación de ingresos y condiciones de vida: Grupo A (pobreza extrema), Grupo B (pobreza moderada), Grupo C (vulnerabilidad) y Grupo D (población no pobre ni vulnerable).',
    },
    {
      type: 'chart',
      title: 'Personas categorizadas en Sisbén IV por grupo socioeconómico',
      subtitle: 'Estimación expandida de personas en Villeta según la base certificada del DNP',
      async load({ q, M }) {
        const rows = await q('sisben', {
          $select: 'grupo, corte, count(*) as fichas, sum(fex::number) as pob',
          $where: `cod_mpio='${M.dane}'`,
          $group: 'grupo, corte',
          $order: 'grupo',
        });
        if (!rows.length) return { empty: true };
        const ordered = ['A', 'B', 'C', 'D'].map(g => rows.find(r => r.grupo === g)).filter(Boolean);
        return {
          labelTitle: 'Grupo Sisbén IV',
          asOf: ofYear(rows[0]?.corte?.replace('SIV_', '')),
          chart: {
            kind: 'hbar',
            labels: ordered.map(r => GRUPOS_SISBEN[r.grupo] || r.grupo),
            series: [{ name: 'Personas (factor de expansión)', data: ordered.map(r => Math.round(toNum(r.pob) || 0)) }],
          },
          note: 'Cifras expandidas con el factor de expansión muestral (fex) de la base anonimizada del DNP para el código DANE 25875.',
        };
      },
    },
    {
      type: 'chart',
      title: 'Población en Sisbén IV por grupo y zona geográfica',
      subtitle: 'Cabecera municipal frente a centros poblados y rural disperso en Villeta',
      async load({ q, M }) {
        const rows = await q('sisben', {
          $select: 'grupo, zona, corte, sum(fex::number) as pob',
          $where: `cod_mpio='${M.dane}'`,
          $group: 'grupo, zona, corte',
        });
        if (!rows.length) return { empty: true };
        const grupos = ['A', 'B', 'C', 'D'];
        const val = (g, z) => Math.round(toNum(rows.find(r => r.grupo === g && String(r.zona) === z)?.pob) || 0);
        return {
          labelTitle: 'Grupo Sisbén IV',
          asOf: ofYear(rows[0]?.corte?.replace('SIV_', '')),
          chart: {
            kind: 'bar',
            labels: grupos.map(g => `Grupo ${g}`),
            series: [
              { name: ZONAS_SISBEN['1'], data: grupos.map(g => val(g, '1')) },
              { name: ZONAS_SISBEN['2'], data: grupos.map(g => val(g, '2')) },
            ],
          },
          note: 'En la zona rural y centros poblados se concentra el mayor número de personas en los grupos A (pobreza extrema) y B (pobreza moderada).',
        };
      },
    },

    {
      type: 'heading',
      title: 'Programas de superación de la pobreza y primera infancia',
      text: 'Transferencias monetarias condicionadas y no condicionadas administradas por Prosperidad Social y servicios de educación inicial y cuidado del Instituto Colombiano de Bienestar Familiar (ICBF) en el Centro Zonal Villeta.',
    },
    {
      type: 'chart',
      title: 'Inversión por programa de Prosperidad Social en Villeta',
      subtitle: 'Recursos transferidos en el municipio según la Ficha de Inversión Municipal del DPS',
      async load({ q, M }) {
        const rows = await q('dps_inversion', {
          $select: 'nombre_programa_salida, familias_periodo_presidencial, personas_periodo_presidencial, inversion_periodo_presidencial',
          $where: `codigo_dane='${M.dane}'`,
          $order: 'inversion_periodo_presidencial::number DESC',
        });
        const conInv = rows.filter(r => toNum(r.inversion_periodo_presidencial) > 0);
        if (!conInv.length) return { empty: true };
        return {
          labelTitle: 'Programa social',
          chart: {
            kind: 'hbar',
            labels: conInv.map(r => titleCase(r.nombre_programa_salida)),
            series: [{ name: 'Inversión (COP)', data: conInv.map(r => toNum(r.inversion_periodo_presidencial)) }],
            format: 'cop',
          },
          table: {
            columns: [
              { key: 'prog', label: 'Programa de Prosperidad Social' },
              { key: 'fam', label: 'Familias / hogares', format: 'num', align: 'right' },
              { key: 'per', label: 'Personas', format: 'num', align: 'right' },
              { key: 'inv', label: 'Inversión acumulada', format: 'cop', align: 'right' },
            ],
            rows: rows.map(r => ({
              prog: titleCase(r.nombre_programa_salida),
              fam: toNum(r.familias_periodo_presidencial) || 0,
              per: toNum(r.personas_periodo_presidencial) || 0,
              inv: toNum(r.inversion_periodo_presidencial) || 0,
            })),
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Beneficiarios activos de Más Familias en Acción por edad y género',
      subtitle: 'Personas con inscripción activa en el municipio de Villeta',
      async load({ q, M }) {
        const rows = await q('dps_familias', {
          $select: 'rangoedad, genero, sum(cantidaddebeneficiarios::number) as n',
          $where: `codigomunicipioatencion='${M.dane}' and estadobeneficiario='ACTIVO'`,
          $group: 'rangoedad, genero',
          $order: 'rangoedad',
        });
        if (!rows.length) return { empty: true };
        const rangos = [...new Set(rows.map(r => r.rangoedad))].sort();
        const val = (rng, gen) => sum(rows.filter(r => r.rangoedad === rng && r.genero === gen), r => r.n);
        return {
          labelTitle: 'Rango de edad',
          chart: {
            kind: 'bar',
            labels: rangos,
            series: [
              { name: 'Mujeres', data: rangos.map(rng => val(rng, 'Mujer')) },
              { name: 'Hombres', data: rangos.map(rng => val(rng, 'Hombre')) },
            ],
          },
        };
      },
    },
    {
      type: 'chart',
      title: 'Beneficiarios de Primera Infancia del ICBF por servicio en Villeta',
      subtitle: 'Niños, niñas y mujeres gestantes atendidos en el Centro Zonal Villeta (última vigencia)',
      async load({ q, M }) {
        const [v] = await q('icbf_beneficiarios', {
          $select: 'max(vigencia) as v',
          $where: `codigo_municipio_uds='${M.dane}'`,
        });
        if (!v?.v) return { empty: true };
        const rows = await q('icbf_beneficiarios', {
          $select: 'nombre_servicio, sum(beneficiarios::number) as b, count(distinct codigo_unidad_servicio) as uds',
          $where: `codigo_municipio_uds='${M.dane}' and vigencia='${v.v}'`,
          $group: 'nombre_servicio',
          $order: 'b DESC',
        });
        if (!rows.length) return { empty: true };
        return {
          labelTitle: 'Servicio de Primera Infancia',
          asOf: ofYear(v.v),
          chart: {
            kind: 'hbar',
            labels: rows.map(r => titleCase(r.nombre_servicio)),
            series: [{ name: `Beneficiarios (${v.v})`, data: rows.map(r => toNum(r.b)) }],
          },
          note: `Vigencia ${v.v} del Centro Zonal Villeta (código 2505) del ICBF.`,
        };
      },
    },
    {
      type: 'table',
      title: 'Directorio de Unidades de Servicio (UDS) de Primera Infancia del ICBF',
      subtitle: 'Jardines comunitarios, hogares comunitarios de bienestar (HCB) y unidades de educación inicial en Villeta',
      async load({ q, M }) {
        const [v] = await q('icbf_uds', {
          $select: 'max(vigencia) as v',
          $where: `codigo_dane_municipio='${M.dane}'`,
        });
        if (!v?.v) return { empty: true };
        const rows = await q('icbf_uds', {
          $select: 'nombre_unidad_servicio, zona_ubicacion, direccion, estado',
          $where: `codigo_dane_municipio='${M.dane}' and vigencia='${v.v}'`,
          $order: 'nombre_unidad_servicio',
          $limit: 200,
        });
        if (!rows.length) return { empty: true };
        const zonaLabel = z => (z === 'C' ? 'Cabecera urbana' : z === 'R' ? 'Rural / centro poblado' : z || '—');
        return {
          asOf: ofYear(v.v),
          table: {
            columns: [
              { key: 'nombre', label: 'Unidad de Servicio (UDS)' },
              { key: 'zona', label: 'Zona' },
              { key: 'dir', label: 'Dirección institucional' },
              { key: 'estado', label: 'Estado' },
            ],
            rows: rows.map(r => ({
              nombre: titleCase(r.nombre_unidad_servicio),
              zona: zonaLabel(r.zona_ubicacion),
              dir: r.direccion || '—',
              estado: titleCase(r.estado || '—'),
            })),
          },
          note: `Vigencia ${v.v} (${num(rows.length)} unidades registradas en Villeta). Se publican únicamente nombres y direcciones institucionales de las unidades de servicio.`,
        };
      },
    },

    {
      type: 'heading',
      title: 'Protección a la vejez y organización comunitaria',
      text: 'Afiliación y mesadas del Régimen de Prima Media administrado por Colpensiones y registro de organizaciones comunales (Juntas de Acción Comunal y de Vivienda Comunitaria) ante el IDACO.',
    },
    {
      type: 'chart',
      title: 'Afiliados y pensionados de Colpensiones en Villeta',
      subtitle: 'Población vinculada al Régimen de Prima Media con Prestación Definida en el municipio',
      async load({ q }) {
        const [af, pen] = await Promise.all([
          q('colpensiones_afiliados', {
            $select: 'genero, sum(cantidad::number) as n',
            $where: "upper(departamento)='CUNDINAMARCA' and upper(municipio)='VILLETA'",
            $group: 'genero',
            $order: 'n DESC',
          }),
          q('colpensiones_pensionados', {
            $select: 'sum(cantidad::number) as n',
            $where: "upper(departamento)='CUNDINAMARCA' and upper(municipio)='VILLETA'",
          }),
        ]);
        if (!af.length && !pen.length) return { empty: true };
        const items = [
          ...af.map(r => ({ label: `Afiliados (${titleCase(r.genero)})`, val: toNum(r.n) || 0 })),
          { label: 'Pensionados en nómina', val: toNum(pen[0]?.n) || 0 },
        ];
        return {
          labelTitle: 'Categoría en Colpensiones',
          sources: ['colpensiones_afiliados', 'colpensiones_pensionados'],
          chart: {
            kind: 'hbar',
            labels: items.map(x => x.label),
            series: [{ name: 'Personas', data: items.map(x => x.val) }],
          },
          note: 'Los afiliados comprenden cotizantes activos e inactivos registrados en el Régimen de Prima Media con residencia en Villeta.',
        };
      },
    },
    {
      type: 'table',
      title: 'Juntas de Acción Comunal (JAC) y de Vivienda Comunitaria en Villeta',
      subtitle: 'Organismos comunales de primer grado registrados ante el IDACO Cundinamarca',
      async load({ q }) {
        const rows = await q('idaco_jac', {
          $select: 'jac, tipo_de_organismo, pj_n, pj_fec_dd_mm_yyyy, fecha',
          $where: "upper(municipio)='VILLETA'",
          $order: 'tipo_de_organismo, jac',
          $limit: 200,
        });
        if (!rows.length) return { empty: true };
        return {
          asOf: ofDate(rows[0]?.fecha),
          table: {
            columns: [
              { key: 'jac', label: 'Barrio / vereda / organización' },
              { key: 'tipo', label: 'Tipo de organismo' },
              { key: 'pj', label: 'Personería jurídica' },
              { key: 'fec', label: 'Fecha personería' },
            ],
            rows: rows.map(r => ({
              jac: titleCase(r.jac),
              tipo: titleCase(r.tipo_de_organismo),
              pj: r.pj_n || '—',
              fec: r.pj_fec_dd_mm_yyyy ? String(r.pj_fec_dd_mm_yyyy).slice(0, 10) : '—',
            })),
          },
          note: `${num(rows.length)} organizaciones comunales con personería jurídica vigente registradas en el municipio de Villeta.`,
        };
      },
    },
  ],
};
