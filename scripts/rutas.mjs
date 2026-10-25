// Genera una copia de index.html por sección y subsección (turismo/index.html, turismo/llegada-de-visitantes…/index.html)
// para que las URLs limpias funcionen al abrirlas o compartirlas, con su título y vista previa para redes, además de
// 404.html como respaldo y sitemap.xml. Ejecutar después de cambiar index.html, el menú o los encabezados de una sección:
//   node scripts/rutas.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { NAV } from '../js/nav.js';
import { slug } from '../js/slug.js';

const SITE = 'https://leotinoco.github.io/datavilleta/';
const SITE_PATH = new URL(SITE).pathname;
const root = new URL('../', import.meta.url);
const tpl = readFileSync(new URL('index.html', root), 'utf8');

const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const texto = html => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const set = (h, re, value) => h.replace(re, (m, a, b) => `${a}${attr(value)}${b}`);

function pagina({ base, title, desc, url }) {
  let h = tpl.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <base href="${base}">`);
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`);
  h = set(h, /(<meta name="description" content=")[^"]*(">)/, desc);
  h = set(h, /(<link rel="canonical" href=")[^"]*(">)/, url);
  h = set(h, /(<meta property="og:title" content=")[^"]*(">)/, title);
  h = set(h, /(<meta property="og:description" content=")[^"]*(">)/, desc);
  h = set(h, /(<meta property="og:url" content=")[^"]*(">)/, url);
  h = set(h, /(<meta name="twitter:title" content=")[^"]*(">)/, title);
  h = set(h, /(<meta name="twitter:description" content=")[^"]*(">)/, desc);
  return h;
}

function escribir(ruta, html) {
  const dir = new URL(ruta, root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html);
}

const urls = [SITE];
for (const n of NAV.filter(x => x.id !== 'inicio')) {
  const section = (await import(`../js/sections/${n.id}.js`)).default;
  rmSync(new URL(`${n.id}/`, root), { recursive: true, force: true });
  const desc = `${n.label} en Villeta, Cundinamarca: ${n.desc}. Datos oficiales con fuente y fecha.`;
  escribir(`${n.id}/`, pagina({ base: '../', title: `${n.label} · Datavilleta`, desc, url: `${SITE}${n.id}/` }));
  urls.push(`${SITE}${n.id}/`);
  for (const b of (section.blocks || []).filter(x => x.type === 'heading')) {
    const s = slug(b.title);
    const url = `${SITE}${n.id}/${s}/`;
    escribir(`${n.id}/${s}/`, pagina({ base: '../../', title: `${b.title} · ${n.label} · Datavilleta`, desc: texto(b.text) || desc, url }));
    urls.push(url);
  }
}

// Respaldo para rutas no generadas: GitHub Pages sirve 404.html y la aplicación resuelve la ruta.
writeFileSync(new URL('404.html', root), tpl.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <base href="${SITE_PATH}">`));
writeFileSync(new URL('sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`${urls.length} rutas generadas, más 404.html y sitemap.xml.`);
