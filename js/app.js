import { NAV } from './nav.js';
import { renderSection } from './ui.js';
import { clearCache } from './soda.js';
import inicio from './sections/inicio.js';
import turismo from './sections/turismo.js';
import economia from './sections/economia.js';
import servicios from './sections/servicios.js';
import seguridad from './sections/seguridad.js';
import educacion from './sections/educacion.js';
import salud from './sections/salud.js';
import agro from './sections/agro.js';
import contratacion from './sections/contratacion.js';
import victimas from './sections/victimas.js';
import territorio from './sections/territorio.js';
import fuentes from './sections/fuentes.js';

const SECTIONS = Object.fromEntries([inicio, turismo, economia, servicios, seguridad, educacion, salud, agro, contratacion, victimas, territorio, fuentes].map(s => [s.id, s]));
const main = document.getElementById('main');
const nav = document.getElementById('nav-list');
const navToggle = document.getElementById('nav-toggle');

// Ruta: #/seccion?filtro=valor
function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { id: SECTIONS[path] ? path : 'inicio', params: new URLSearchParams(qs || '') };
}

function filtersFor(section, params) {
  const out = {};
  for (const f of section.filters || []) {
    const v = params.get(f.id);
    out[f.id] = f.options.some(o => String(o.value) === v) ? v : f.default;
  }
  return out;
}

function setHash(id, filters) {
  const qs = new URLSearchParams(filters).toString();
  const next = `#/${id}${qs ? `?${qs}` : ''}`;
  if (location.hash !== next) history.replaceState(null, '', next);
}

function render() {
  const { id, params } = parseHash();
  const section = SECTIONS[id];
  const filters = filtersFor(section, params);
  for (const a of nav.querySelectorAll('a')) a.setAttribute('aria-current', a.dataset.id === id ? 'page' : 'false');
  document.title = id === 'inicio' ? 'Datavilleta · Villeta en datos' : `${NAV.find(n => n.id === id)?.label} · Datavilleta`;
  renderSection(section, main, {
    filters,
    onFilterChange(key, value) {
      filters[key] = value;
      setHash(id, filters);
      render();
    },
  });
}

nav.innerHTML = NAV.map(n => `<li><a href="#/${n.id}" data-id="${n.id}">${n.label}</a></li>`).join('');
nav.addEventListener('click', e => {
  if (e.target.closest('a')) {
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});
navToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(open));
});

let lastId = null;
window.addEventListener('hashchange', () => {
  const { id } = parseHash();
  render();
  if (id !== lastId) window.scrollTo({ top: 0 });
  lastId = id;
});

document.getElementById('refresh').addEventListener('click', () => {
  clearCache();
  render();
});

// Tema claro/oscuro: respeta el sistema y permite forzarlo; los gráficos se redibujan con la nueva paleta.
const themeBtn = document.getElementById('theme');
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.innerHTML = `<span class="wide-only">Tema </span><span class="cap-narrow">${dark ? 'claro' : 'oscuro'}</span>`;
}
let saved = null;
try { saved = localStorage.getItem('dv:theme'); } catch { /* sin almacenamiento */ }
applyTheme(saved);
themeBtn.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  try { localStorage.setItem('dv:theme', next); } catch { /* sin almacenamiento */ }
  applyTheme(next);
  render();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.dataset.theme) { applyTheme(null); render(); } });

lastId = parseHash().id;
render();
