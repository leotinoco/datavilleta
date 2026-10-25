// Identificador legible para URLs a partir de un título:
// "Evolución del registro turístico, 2005–2026" → "evolucion-del-registro-turistico-2005-2026".
// Lo usan el enrutador del sitio y scripts/rutas.mjs, que genera una página estática por ruta.
export const slug = s => String(s)
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .slice(0, 60).replace(/-+$/, '');

// Subsecciones de una sección: sus bloques de tipo 'heading'.
export const subsecciones = section => (section.blocks || []).filter(b => b.type === 'heading').map(b => ({ slug: slug(b.title), title: b.title }));
