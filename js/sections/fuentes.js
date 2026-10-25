import { SOURCES, FUENTES_COMPLEMENTARIAS } from '../sources.js';
import { metadata, discover, datasetUrl, resourceUrl } from '../soda.js';
import { fecha, escapeHtml, titleCase } from '../format.js';
import { CRITERIO } from '../freshness.js';

const link = (url, text) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;

export default {
  id: 'fuentes',
  eyebrow: 'Transparencia',
  title: 'Fuentes y metodología',
  intro: 'Todas las cifras del sitio se consultan directamente en las APIs oficiales; no hay datos copiados a mano. Aquí se listan los conjuntos utilizados, la entidad responsable, su última actualización en el portal y el método de cálculo.',
  blocks: [
    {
      type: 'table',
      title: 'Conjuntos de datos utilizados',
      subtitle: 'Fecha de actualización consultada en vivo en datos.gov.co',
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
              { key: 'actualizado', label: 'Actualizado', format: v => (v ? fecha(v) : '—') },
              { key: 'id', label: 'API', html: v => link(resourceUrl(v, { $limit: 5 }), v) },
            ],
            rows,
          },
          maxHeight: 640,
        };
      },
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="prose">
        <h2>Metodología</h2>
        <ul>
          <li><strong>Consulta en vivo.</strong> Cada tarjeta ejecuta consultas SoQL contra la API SODA de datos.gov.co filtrando por Villeta (código DANE 25875 o el nombre del municipio, según el campo disponible). El enlace "Consulta API" de cada tarjeta muestra la consulta exacta para reproducir la cifra.</li>
          <li><strong>Caché.</strong> Las respuestas se guardan 6 horas en el navegador para no saturar el portal. El botón "Actualizar datos" del encabezado borra esa caché.</li>
          <li><strong>Vigencia del dato.</strong> Cada gráfico indica arriba a la derecha el periodo de su dato más reciente (año, trimestre, mes o día, según la fuente) y si está <em>✓ Actualizado</em>, <em>◔ Con rezago</em> o <em>! Desactualizado</em>. ${escapeHtml(CRITERIO)} Cuando la fuente no trae fecha propia se muestra la fecha de publicación en el portal.</li>
          <li><strong>Comparativos año a año.</strong> Las barras incluyen en su detalle la variación frente al año anterior. El año en curso aparece atenuado y marcado con * porque está incompleto.</li>
          <li><strong>Año corrido.</strong> Para delitos, pasajeros y contratación se compara el mismo periodo (1 de enero a la fecha de corte) del año actual y del anterior. En delitos, la fecha de corte es el último hecho publicado por el Ministerio de Defensa.</li>
          <li><strong>Cambios de metodología.</strong> Cuando una fuente cambió de método (p. ej. EVA agropecuaria en 2019, sistemas de denuncia hacia 2016) se advierte en la tarjeta y las series se muestran por separado.</li>
          <li><strong>Cobertura geográfica.</strong> El registro mercantil abierto (RUES) no trae municipio: sus cifras corresponden a toda la jurisdicción de la Cámara de Comercio de Facatativá.</li>
          <li><strong>Datos personales.</strong> Se omiten correos, teléfonos y nombres de personas naturales aunque estén en las fuentes.</li>
          <li><strong>Seguimiento de registros sin histórico.</strong> El RNT, el RUPS y el REPS se publican como fotografía vigente. El script <code>scripts/snapshot.mjs</code> del repositorio guarda un resumen mensual en <code>data/snapshots/</code> para construir su evolución.</li>
        </ul>
        <h2>Cómo citar</h2>
        <p>Cite la entidad responsable y el conjunto de datos indicados al pie de cada gráfico, por ejemplo: <em>Ministerio de Comercio, Industria y Turismo, "Registro Nacional de Turismo – RNT", datos.gov.co (thwd-ivmp), consultado el ${fecha(new Date())}.</em></p>
      </div>`,
    },
    {
      type: 'table',
      title: 'Otros conjuntos en datos.gov.co que mencionan a Villeta',
      subtitle: 'Búsqueda en vivo en el catálogo nacional: útil para detectar nuevas publicaciones',
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
              { key: 'name', label: 'Conjunto', html: (v, r) => link(datasetUrl(r.id), v) },
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
      type: 'table',
      title: 'Documentos oficiales transcritos (sin API abierta)',
      subtitle: 'Cifras de la ESP Villeta tomadas de PDF oficiales y guardadas en data/esp-villeta.json',
      wide: true,
      sourceText: 'E.S.P. Villeta (sitio web oficial, sección de transparencia) y Superintendencia de Servicios Públicos Domiciliarios.',
      async load() {
        const res = await fetch('data/esp-villeta.json', { cache: 'no-cache' });
        if (!res.ok) return { empty: true };
        const d = await res.json();
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'entidad', label: 'Entidad' },
              { key: 'titulo', label: 'Documento', html: (v, r) => link(r.url, v) },
              { key: 'fecha', label: 'Fecha / corte', format: v => fecha(v) },
            ],
            rows: Object.values(d.documentos),
          },
          note: `Transcripción revisada el ${fecha(d.actualizado)}: cada estado de resultados y balance cuadra aritméticamente. Para actualizar, agregue el nuevo año en data/esp-villeta.json con su documento fuente.`,
        };
      },
    },
    {
      type: 'table',
      title: 'Bodega de datos del SUI transcrita (sin API)',
      subtitle: 'Información comercial por prestador guardada en data/sui-comercial-villeta.json',
      wide: true,
      async load() {
        const res = await fetch('data/sui-comercial-villeta.json', { cache: 'no-cache' });
        if (!res.ok) return { empty: true };
        const d = await res.json();
        return {
          asOf: false,
          table: {
            columns: [
              { key: 'nombre', label: 'Prestador' },
              { key: 'servicio', label: 'Servicio', format: v => titleCase(v) },
              { key: 'periodo', label: 'Periodos en el SUI' },
            ],
            rows: d.prestadores.map(p => ({ nombre: p.nombre, servicio: p.servicio, periodo: `${p.desde} a ${p.hasta}` })),
          },
          note: `Consulta pública del cubo SUI_COMERCIAL (${d.fuente.filtros}) hecha el ${fecha(`${d.fuente.consultado}T12:00:00`)}; también incluye energía, gas y telefonía del municipio. ${d.calidad.length} advertencias de calidad documentadas en el archivo.`,
          sourceText: `<span class="source-entity">${escapeHtml(d.fuente.entidad)}</span> — ${link(d.fuente.url, d.fuente.sistema)}`,
        };
      },
    },
    {
      type: 'html',
      wide: true,
      html: `<div class="prose"><h2>Fuentes complementarias sin API abierta</h2><p>Estas fuentes oficiales tienen información de Villeta pero no la exponen mediante una API pública abierta; se consultan manualmente.</p><ul>${FUENTES_COMPLEMENTARIAS.map(f => `<li><strong>${escapeHtml(f.entidad)}</strong> — ${link(f.url, f.nombre)}</li>`).join('')}</ul></div>`,
    },
  ],
};
