// Catálogo de fuentes oficiales usadas en el sitio. Cada gráfico cita una o más de estas claves.
// id = identificador del conjunto de datos en datos.gov.co (API Socrata / SODA).

const MINDEFENSA = 'Ministerio de Defensa Nacional – Policía Nacional (SIEDCO)';
const SSPD = 'Superintendencia de Servicios Públicos Domiciliarios (Superservicios)';
const SFC = 'Superintendencia Financiera de Colombia';
const UNGRD = 'Unidad Nacional para la Gestión del Riesgo de Desastres (UNGRD)';
const UARIV = 'Unidad para la Atención y Reparación Integral a las Víctimas (UARIV)';

export const SOURCES = {
  // Turismo y movilidad
  rnt: { id: 'thwd-ivmp', entidad: 'Ministerio de Comercio, Industria y Turismo (MinCIT)', nombre: 'Registro Nacional de Turismo – RNT', tema: 'Turismo' },
  supertransporte: { id: 'eh75-8ah6', entidad: 'Superintendencia de Transporte', nombre: 'Operación de pasajeros y despacho de vehículos en terminales (transporte por carretera)', tema: 'Turismo' },

  // Economía y empresas
  rues: { id: 'c82u-588k', entidad: 'Confecámaras – RUES (Cámara de Comercio de Facatativá)', nombre: 'Personas naturales, personas jurídicas y entidades sin ánimo de lucro', tema: 'Economía' },
  rues_estab: { id: 'nb3d-v3n7', entidad: 'Confecámaras – RUES (Cámara de Comercio de Facatativá)', nombre: 'Establecimientos, agencias y sucursales', tema: 'Economía' },
  sfc_captaciones: { id: 'u2wk-tfe3', entidad: SFC, nombre: 'Saldo de las captaciones y colocaciones por municipios', tema: 'Economía' },
  sfc_puntos: { id: 'vkbt-desu', entidad: SFC, nombre: 'Puntos de atención de canales por municipio', tema: 'Economía' },
  supersociedades: { id: '6cat-2gcs', entidad: 'Superintendencia de Sociedades', nombre: '10.000 empresas más grandes del país', tema: 'Economía' },
  supersolidaria: { id: 'kg2d-yfyg', entidad: 'Superintendencia de la Economía Solidaria', nombre: 'Listado de entidades del sector solidario', tema: 'Economía' },

  // Servicios públicos
  rups: { id: '4qkq-csdn', entidad: SSPD, nombre: 'Registro Único de Prestadores de Servicios Públicos – RUPS', tema: 'Servicios públicos' },
  sspd_residuos: { id: 'd7pt-p5fi', entidad: SSPD, nombre: 'Residuos generados en el área de prestación del servicio de aseo', tema: 'Servicios públicos' },
  sspd_pqr_energia: { id: 'myu9-6wb7', entidad: SSPD, nombre: 'Reclamaciones y quejas – energía', tema: 'Servicios públicos' },
  ins_irca: { id: 'nxt2-39c3', entidad: 'Instituto Nacional de Salud (INS) – SIVICAP', nombre: 'Calidad del agua para consumo humano (IRCA)', tema: 'Servicios públicos' },
  mintic_internet_hist: { id: 'n48w-gutb', entidad: 'Ministerio de Tecnologías de la Información y las Comunicaciones (MinTIC)', nombre: 'Internet fijo: accesos por tecnología y segmento (histórico)', tema: 'Servicios públicos' },
  mintic_internet: { id: 'hwrp-3su3', entidad: 'Ministerio de Tecnologías de la Información y las Comunicaciones (MinTIC)', nombre: 'Accesos fijos a internet por proveedor, municipio, tecnología y velocidad', tema: 'Servicios públicos' },

  // Educación y cultura
  men: { id: 'nudc-7mev', entidad: 'Ministerio de Educación Nacional (MEN)', nombre: 'Estadísticas en educación preescolar, básica y media por municipio', tema: 'Educación' },
  icfes: { id: 'kgxf-xxbe', entidad: 'Instituto Colombiano para la Evaluación de la Educación (ICFES)', nombre: 'Resultados únicos Saber 11', tema: 'Educación' },
  mincultura: { id: 'bq7b-e3sb', entidad: 'Ministerio de las Culturas, las Artes y los Saberes', nombre: 'Beneficiarios del Ministerio de las Culturas', tema: 'Educación' },

  // Salud
  reps: { id: 'c36g-9fc2', entidad: 'Ministerio de Salud y Protección Social', nombre: 'Registro Especial de Prestadores y Sedes de Servicios de Salud – REPS', tema: 'Salud' },
  afiliados: { id: 'hn4i-593p', entidad: 'Ministerio de Salud y Protección Social', nombre: 'Número de afiliados por departamento, municipio y régimen', tema: 'Salud' },

  // Agro
  eva_hist: { id: '2pnw-mmge', entidad: 'Ministerio de Agricultura y Desarrollo Rural', nombre: 'Evaluaciones Agropecuarias Municipales – EVA 2007–2018', tema: 'Agro' },
  eva: { id: 'uejq-wxrr', entidad: 'Unidad de Planificación Rural Agropecuaria (UPRA)', nombre: 'Evaluaciones Agropecuarias Municipales – EVA 2019 en adelante (base agrícola)', tema: 'Agro' },
  fng: { id: 'cea5-4ctf', entidad: 'Fondo Nacional del Ganado (FNG) – Fedegán / ICA', nombre: 'Inventario bovino y bufalino por ciclo de vacunación', tema: 'Agro' },
  finagro: { id: 'jjvv-55ck', entidad: 'Fondo para el Financiamiento del Sector Agropecuario (FINAGRO)', nombre: 'Desembolsos de crédito de fomento agropecuario', tema: 'Agro' },

  // Contratación y finanzas públicas
  secop: { id: 'rpmr-utcd', entidad: 'Agencia Nacional de Contratación Pública – Colombia Compra Eficiente', nombre: 'SECOP Integrado (SECOP I y II)', tema: 'Contratación' },
  sgr: { id: 'g4qj-2p2e', entidad: 'Ministerio de Hacienda y Crédito Público', nombre: 'Ejecución presupuestal del Sistema General de Regalías (SGR)', tema: 'Contratación' },
  mdm: { id: 'nkjx-rsq7', entidad: 'Departamento Nacional de Planeación (DNP)', nombre: 'Medición del Desempeño Municipal (MDM)', tema: 'Contratación' },

  // Víctimas
  uariv_hechos: { id: '9qih-4vkc', entidad: UARIV, nombre: 'Cifras de víctimas por hechos – nivel municipal', tema: 'Víctimas' },
  uariv_desplazamiento: { id: 'krnc-8azs', entidad: UARIV, nombre: 'Desplazamiento anualizado: ocurrencia y llegada – nivel municipal', tema: 'Víctimas' },

  // Territorio, riesgo y ambiente
  catastro: { id: 'h9h6-gkdg', entidad: 'Agencia Catastral de Cundinamarca', nombre: 'Base catastral municipio de Villeta', tema: 'Territorio' },
  ungrd_2019: { id: '4fd8-ptcr', entidad: UNGRD, nombre: 'Emergencias UNGRD 2019', tema: 'Territorio' },
  ungrd_2020: { id: '4t8v-ywmw', entidad: UNGRD, nombre: 'Emergencias 2020', tema: 'Territorio' },
  ungrd_2023: { id: 'rgre-6ak4', entidad: UNGRD, nombre: 'Emergencias UNGRD 2023–2024', tema: 'Territorio' },
  ungrd_v2: { id: '2343-nuqp', entidad: UNGRD, nombre: 'Emergencias UNGRD V2 (2025 en adelante)', tema: 'Territorio' },
};

// Delitos y conductas reportadas por la Policía Nacional (MinDefensa). Todas comparten el esquema
// fecha_hecho, cod_muni, cantidad.
export const DELITOS = [
  { key: 'hurto_personas', id: '4rxi-8m8d', nombre: 'Hurto a personas' },
  { key: 'hurto_residencias', id: '7mn7-vzqp', nombre: 'Hurto a residencias' },
  { key: 'hurto_comercio', id: '7i2x-h5vp', nombre: 'Hurto a comercio' },
  { key: 'hurto_vehiculos', id: 'csb4-y6v2', nombre: 'Hurto a vehículos (motos y automotores)' },
  { key: 'abigeato', id: 'p88b-5ac7', nombre: 'Abigeato (hurto de ganado)' },
  { key: 'homicidio', id: 'm8fd-ahd9', nombre: 'Homicidio' },
  { key: 'lesiones', id: 'jr6v-i33g', nombre: 'Lesiones personales' },
  { key: 'vif', id: 'gepp-dxcs', nombre: 'Violencia intrafamiliar' },
  { key: 'sexuales', id: 'bz43-8ahq', nombre: 'Delitos sexuales' },
  { key: 'extorsion', id: 'q2ib-t9am', nombre: 'Extorsión' },
  { key: 'informaticos', id: '4v6r-wu98', nombre: 'Delitos informáticos' },
  { key: 'homicidio_transito', id: 'uav5-b85g', nombre: 'Homicidio en accidente de tránsito' },
  { key: 'lesiones_transito', id: 'ntej-qq7v', nombre: 'Lesiones en accidente de tránsito' },
  { key: 'ambiente', id: '9zck-qfvc', nombre: 'Delitos contra el medio ambiente' },
  { key: 'secuestro', id: 'd7zw-hpf4', nombre: 'Secuestro' },
];
for (const d of DELITOS) {
  SOURCES[`delito_${d.key}`] = { id: d.id, entidad: MINDEFENSA, nombre: d.nombre, tema: 'Seguridad' };
}

// Fuentes oficiales relevantes que no exponen una API abierta (consulta manual / descarga).
export const FUENTES_COMPLEMENTARIAS = [
  { entidad: 'DANE', nombre: 'Proyecciones de población municipal (CNPV 2018)', url: 'https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion' },
  { entidad: 'DNP', nombre: 'TerriData – ficha territorial de Villeta', url: 'https://terridata.dnp.gov.co/index-app.html#/perfiles/25875' },
  { entidad: 'Superservicios', nombre: 'SUI – Sistema Único de Información de servicios públicos (suscriptores, tarifas, consumo)', url: 'https://sui.superservicios.gov.co/' },
  { entidad: 'MinCIT', nombre: 'CITUR – Centro de Información Turística de Colombia (ocupación hotelera, visitantes)', url: 'https://www.citur.gov.co/' },
  { entidad: 'Confecámaras', nombre: 'RUES – consulta de matrículas mercantiles', url: 'https://www.rues.org.co/' },
  { entidad: 'Cámara de Comercio de Facatativá', nombre: 'Estudios económicos y estadísticas de la jurisdicción', url: 'https://www.ccfacatativa.org.co/' },
  { entidad: 'Contraloría General de la República', nombre: 'CUIPO / CHIP – ejecución presupuestal territorial', url: 'https://www.chip.gov.co/' },
  { entidad: 'Colombia Compra Eficiente', nombre: 'SECOP II – búsqueda de procesos', url: 'https://community.secop.gov.co/' },
];
