import { SOURCES, FUENTES_COMPLEMENTARIAS } from '../sources.js';
import { metadata, discover, datasetUrl, resourceUrl } from '../soda.js';
import { num, fecha, escapeHtml, titleCase } from '../format.js';
import { CRITERIO } from '../freshness.js';

const link = (url, text) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;

export default {
  id: 'fuentes',
  eyebrow: 'Transparencia, rigor técnico y reproducibilidad',
  title: 'Fuentes y metodología',
  intro: `Todas las cifras de este observatorio se consultan en vivo desde las APIs oficiales del Estado colombiano (${num(Object.keys(SOURCES).length)} conjuntos de datos registrados en datos.gov.co) o provienen de documentos técnicos auditados y referenciados línea por línea. Aquí se detallan el catálogo completo de fuentes, los criterios metodológicos y la guía de verificación para periodistas y servidores públicos.`,
  blocks: [
    {
      type: 'heading',
      title: 'Catálogo de conjuntos de datos en vivo',
      text: 'Cada fila enlaza al conjunto original en el Portal de Datos Abiertos de Colombia (datos.gov.co) y al punto de consulta Socrata (SODA) utilizado por la aplicación.',
    },
    {
      type: 'table',
      title: 'Conjuntos de datos utilizados en Datavilleta',
      subtitle: 'Fecha de actualización consultada en tiempo real en datos.gov.co (/api/views)',
      wide: true,
      sourceText: 'Portal de Datos Abiertos de Colombia (datos.gov.co) – API de metadatos /api/views.',
      async load() {
        const entries = Object.entries(SOURCES);
        const metas = await Promise.all(entries.map(([, s]) => metadata(s.id).catch(() => null)));
        const rows = entries.map(([key, s], i) => ({ key, ...s, publicado: metas[i]?.attribution || '', actualizado: metas[i]?.rowsUpdatedAt || null }))
          .sort((a, b) => a.tema.localeCompare(b.tema) || a.nombre.localeCompare(b.nombre));
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'tema', label: 'Tema' },
              { key: 'entidad', label: 'Entidad responsable' },
              { key: 'nombre', label: 'Conjunto de datos', html: (v, r) => link(datasetUrl(r.id), v) },
              { key: 'actualizado', label: 'Actualizado en portal', format: v => (v ? fecha(v) : '—') },
              { key: 'id', label: 'ID / API', html: v => link(resourceUrl(v, { $limit: 5 }), v) },
            ],
            rows,
          },
          maxHeight: 680,
          note: `Total: ${num(rows.length)} conjuntos oficiales integrados mediante consultas SoQL en vivo.`,
        };
      },
    },

    {
      type: 'heading',
      title: 'Metodología y guía para periodistas y servidores públicos',
      text: 'Criterios editoriales, estadísticos y legales aplicados en el procesamiento y visualización de la información pública del municipio de Villeta.',
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="prose">
        <h2>Principios metodológicos</h2>
        <ul>
          <li><strong>Consulta directa sin intermediación manual.</strong> Cada tarjeta ejecuta consultas en lenguaje SoQL contra la API SODA de <code>datos.gov.co</code> filtrando por el código DANE de Villeta (<code>25875</code>, departamento <code>25</code>) o por el nombre normalizado del municipio cuando la entidad nacional no incluye el código DIVIPOLA. El desplegable <em>Consulta API</em> al pie de cada tarjeta permite abrir en el navegador la respuesta JSON exacta entregada por el servidor del Estado.</li>
          <li><strong>Caché transparente.</strong> Las respuestas se guardan durante 6 horas en el almacenamiento local del navegador (<code>localStorage</code>) para agilizar la lectura y no saturar el portal nacional. El botón <em>Actualizar datos</em> en la esquina superior derecha limpia esa caché y vuelve a interrogar todas las fuentes en vivo.</li>
          <li><strong>Semáforo de vigencia del dato.</strong> Cada gráfico declara en su encabezado el periodo del último registro disponible (año, trimestre, mes o día exacto de corte) y lo clasifica automáticamente en cuatro estados: <em>✓ Actualizado</em>, <em>◔ Con rezago</em>, <em>! Desactualizado</em> o <em>■ Serie cerrada</em>. ${escapeHtml(CRITERIO)}</li>
          <li><strong>Comparabilidad interanual y año corrido (YTD).</strong> Las series de barras calculan automáticamente la variación porcentual frente al año inmediatamente anterior. En indicadores de registro continuo (delitos SIEDCO, llegada de pasajeros y contratos SECOP), los tableros de año corrido comparan exactamente el mismo intervalo calendario (del 1 de enero al último día con corte disponible) contra idéntico lapso del año previo, evitando sesgos por meses incompletos. El año en curso se identifica con asterisco (<code>*</code>) y tono atenuado.</li>
          <li><strong>Rupturas metodológicas documentadas.</strong> Cuando una entidad nacional modificó la unidad de medida o el sistema de captura (por ejemplo, el cambio de toneladas de panela a toneladas de caña en las Evaluaciones Agropecuarias de 2019, la transición del sistema de denuncias de la Policía hacia 2016 o la migración de SECOP I a SECOP II), las series se presentan separadas o con advertencia explícita al pie de la tarjeta.</li>
          <li><strong>Advertencias de alcance territorial.</strong> Cuando un conjunto oficial no desagrega a nivel municipal o refleja un flujo regional, el encabezado de la tarjeta incluye una etiqueta ámbar de alcance:
            <ul>
              <li><em>Cámara de Comercio de Facatativá (RUES, código 47):</em> el registro mercantil abierto agrega los municipios de la jurisdicción cameral en Sabana Occidente, Gualivá y Tequendama.</li>
              <li><em>Estación de Peaje Caiquero (ANI):</em> mide el tráfico vehicular sobre el corredor vial Bogotá–Villeta–Guaduas (tramo Dindal–Villeta), incluyendo tanto visitantes al municipio como tránsito pasante.</li>
              <li><em>Comparativas departamentales o provinciales:</em> en pruebas Saber 11 (frente a Cundinamarca) e informalidad de la tierra rural UPRA (frente a los 12 municipios de la Provincia del Gualivá).</li>
            </ul>
          </li>
          <li><strong>Protección de datos personales (Leyes 1581 de 2012 y 1712 de 2014).</strong> Aunque algunos conjuntos abiertos del Estado contienen nombres de personas naturales, teléfonos o correos electrónicos, Datavilleta filtra y anonimiza de forma estricta los registros individuales (por ejemplo, profesionales independientes en el REPS, contratistas personas naturales en el SECOP o propietarios en registros prediales), mostrando únicamente razones sociales de personas jurídicas o agregados estadísticos.</li>
          <li><strong>Conservación de series mensuales (snapshots).</strong> Conjuntos como el RNT, el RUPS o el REPS sobrescriben mensualmente su archivo en <code>datos.gov.co</code> sin conservar historial. El script automatizado <code>scripts/snapshot.mjs</code> captura y archiva mensualmente los totales de Villeta en <code>data/snapshots.json</code> para construir la serie longitudinal.</li>
        </ul>

        <h2>Recomendaciones para uso periodístico y gestión pública</h2>
        <ul>
          <li><strong>Cómo citar una cifra:</strong> utilice el botón <em>Copiar cita</em> al pie de cualquier tarjeta, o cite directamente la entidad oficial productora del dato junto con el código de 9 caracteres del conjunto en <code>datos.gov.co</code> y la fecha de corte. Ejemplo: <em>Ministerio de Comercio, Industria y Turismo (MinCIT), "Registro Nacional de Turismo – RNT" (conjunto thwd-ivmp en datos.gov.co), consultado a través del observatorio Datavilleta el ${fecha(new Date())}.</em></li>
          <li><strong>Enlaces directos a subsecciones:</strong> cada bloque temático cuenta con su propia dirección URL limpia (por ejemplo, <code>/seguridad/medicina-legal-y-ciencias-forenses/</code> o <code>/esp/agua-no-contabilizada-ianc/</code>) y un botón <em>Copiar enlace</em> junto al título para compartir o referenciar la sección exacta en informes técnicos, actas del Concejo Municipal o artículos de prensa.</li>
          <li><strong>Impresión y exportación a PDF:</strong> el botón <em>Imprimir / PDF</em> en el encabezado de cada sección formatea automáticamente los gráficos, tablas y citas de fuentes en fondo claro de alto contraste listo para archivar o anexar a documentos oficiales.</li>
        </ul>
      </div>`,
    },

    {
      type: 'heading',
      title: 'Documentos técnicos transcritos y catálogo complementario',
      text: 'Series oficiales de la Empresa de Servicios Públicos de Villeta (ESP), de la bodega comercial del SUI (Superservicios) y del tablero histórico del RNT (MinCIT) que no cuentan con API REST pública y fueron transcritas con verificación aritmética.',
    },
    {
      type: 'table',
      title: 'Documentos oficiales transcritos de la ESP Villeta',
      subtitle: 'Informes de control social, estados financieros y evaluaciones de Superservicios en data/esp-villeta.json',
      wide: true,
      sourceText: 'E.S.P. Villeta (portal oficial de transparencia) y Superintendencia de Servicios Públicos Domiciliarios.',
      async load() {
        const res = await fetch('data/esp-villeta.json', { cache: 'no-cache' });
        if (!res.ok) return { empty: true };
        const d = await res.json();
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'entidad', label: 'Entidad' },
              { key: 'titulo', label: 'Documento oficial', html: (v, r) => link(r.url, v) },
              { key: 'fecha', label: 'Fecha / corte', format: v => fecha(v) },
            ],
            rows: Object.values(d.documentos),
          },
          note: `Transcripción verificada el ${fecha(d.actualizado)}: cada estado de resultados, balance general y cálculo de agua no contabilizada (IANC) cuadra aritméticamente con los informes firmados.`,
        };
      },
    },
    {
      type: 'table',
      title: 'Bodega de datos comercial del SUI transcrita (Superservicios)',
      subtitle: 'Series históricas por prestador de acueducto, alcantarillado, aseo, energía y gas en data/sui-comercial-villeta.json',
      wide: true,
      async load() {
        const res = await fetch('data/sui-comercial-villeta.json', { cache: 'no-cache' });
        if (!res.ok) return { empty: true };
        const d = await res.json();
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'nombre', label: 'Prestador registrado en Villeta' },
              { key: 'servicio', label: 'Servicio', format: v => titleCase(v) },
              { key: 'periodo', label: 'Periodos en el SUI' },
            ],
            rows: d.prestadores.map(p => ({ nombre: p.nombre, servicio: p.servicio, periodo: `${p.desde} a ${p.hasta}` })),
          },
          note: `Consulta pública del cubo SUI_COMERCIAL (${d.fuente.filtros}) realizada el ${fecha(`${d.fuente.consultado}T12:00:00`)}. Incluye ${d.calidad.length} notas técnicas de depuración sobre atípicos de reporte.`,
          sourceText: `<span class="source-entity">${escapeHtml(d.fuente.entidad)}</span> — ${link(d.fuente.url, d.fuente.sistema)}`,
        };
      },
    },
    {
      type: 'table',
      title: 'Otros conjuntos en datos.gov.co que mencionan a Villeta',
      subtitle: 'Exploración automática en vivo mediante la API de catálogo nacional (Discovery API)',
      wide: true,
      sourceText: 'Portal de Datos Abiertos de Colombia (datos.gov.co) – API de catálogo (Discovery API).',
      async load({ M }) {
        const used = new Set(Object.values(SOURCES).map(s => s.id));
        const items = (await discover(M.nombre, 200)).filter(d => !used.has(d.id));
        if (!items.length) return { empty: true };
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'name', label: 'Conjunto o vista en datos.gov.co', html: (v, r) => link(datasetUrl(r.id), v) },
              { key: 'type', label: 'Tipo' },
              { key: 'attribution', label: 'Publicado por', format: v => v || 'Sin entidad declarada' },
              { key: 'updatedAt', label: 'Actualizado', format: v => fecha(v) },
            ],
            rows: items,
          },
          maxHeight: 460,
        };
      },
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="prose"><h2>Portales oficiales complementarios (consulta manual)</h2><p>Estos sistemas nacionales y departamentales contienen cartografía, fichas o microdatos adicionales sobre Villeta que no exponen una API Socrata abierta, pero pueden consultarse directamente en sus portales institucionales:</p><ul>${FUENTES_COMPLEMENTARIAS.map(f => `<li><strong>${escapeHtml(f.entidad)}</strong> — ${link(f.url, f.nombre)}</li>`).join('')}</ul></div>`,
    },
  ],
};
