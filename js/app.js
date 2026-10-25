import { NAV } from './nav.js';
import { renderSection } from './ui.js';
import { clearCache } from './soda.js';
import inicio from './sections/inicio.js';
import turismo from './sections/turismo.js';
import economia from './sections/economia.js';
import servicios from './sections/servicios.js';
import esp from './sections/esp.js';
import seguridad from './sections/seguridad.js';
import educacion from './sections/educacion.js';
import salud from './sections/salud.js';
import agro from './sections/agro.js';
import contratacion from './sections/contratacion.js';
import victimas from './sections/victimas.js';
import territorio from './sections/territorio.js';
import fuentes from './sections/fuentes.js';

const SECTIONS = Object.fromEntries([inicio, turismo, economia, servicios, esp, seguridad, educacion, salud, agro, contratacion, victimas, territorio, fuentes].map(s => [s.id, s]));
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

nav.innerHTML = NAV.map(n => `<li><a href="#/${n.id}" data-id="${n.id}" title="${n.label}"><svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">${n.icon}</svg><span class="nav-label">${n.label}</span></a></li>`).join('');

// Menú contraíble en escritorio (solo íconos); la preferencia se recuerda en el navegador.
const collapseBtn = document.getElementById('nav-collapse');
function setCollapsed(c) {
  document.body.classList.toggle('nav-collapsed', c);
  collapseBtn.setAttribute('aria-expanded', String(!c));
  collapseBtn.title = c ? 'Expandir menú' : 'Contraer menú';
}
let collapsed = false;
try { collapsed = localStorage.getItem('dv:nav') === 'collapsed'; } catch { /* sin almacenamiento */ }
setCollapsed(collapsed);
collapseBtn.addEventListener('click', () => {
  const c = !document.body.classList.contains('nav-collapsed');
  setCollapsed(c);
  try { localStorage.setItem('dv:nav', c ? 'collapsed' : 'expanded'); } catch { /* sin almacenamiento */ }
  // Los gráficos se ajustan al nuevo ancho al terminar la transición.
  setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
});
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

// Tema: oscuro por defecto; el interruptor guarda la preferencia y redibuja los gráficos con la nueva paleta.
const themeSwitch = document.getElementById('theme');
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const dark = t === 'dark';
  themeSwitch.setAttribute('aria-checked', String(dark));
  themeSwitch.title = dark ? 'Modo oscuro activo · cambiar a claro' : 'Modo claro activo · cambiar a oscuro';
}
let saved = null;
try { saved = localStorage.getItem('dv:theme'); } catch { /* sin almacenamiento */ }
applyTheme(saved === 'light' ? 'light' : 'dark');
themeSwitch.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('dv:theme', next); } catch { /* sin almacenamiento */ }
  applyTheme(next);
  render();
});

lastId = parseHash().id;
render();
