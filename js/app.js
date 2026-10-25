import { NAV } from './nav.js';
import { renderSection } from './ui.js';
import { clearCache } from './soda.js';
import { subsecciones } from './slug.js';
import { escapeHtml } from './format.js';
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
const SUBS = Object.fromEntries(Object.values(SECTIONS).map(s => [s.id, subsecciones(s)]));
const main = document.getElementById('main');
const nav = document.getElementById('nav-list');
const navToggle = document.getElementById('nav-toggle');

// Raíz del sitio ('/datavilleta/' en GitHub Pages, '/' en local). Se fija como <base> absoluto para que los
// enlaces relativos y las consultas a data/… sigan apuntando a la raíz después de cambiar la URL con pushState.
const BASE = new URL('./', document.baseURI).pathname;
let baseEl = document.querySelector('base');
if (!baseEl) { baseEl = document.createElement('base'); document.head.prepend(baseEl); }
baseEl.href = `${location.origin}${BASE}`;

// Ruta: /seccion/subseccion/?filtro=valor
const pathFor = (id, sub) => `${BASE}${id === 'inicio' ? '' : `${id}/`}${sub ? `${sub}/` : ''}`;
function parseRoute() {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length).replace(/index\.html$/, '') : '';
  const [sec, sub] = rest.split('/').filter(Boolean);
  const id = SECTIONS[sec] ? sec : 'inicio';
  return { id, sub: SUBS[id].some(x => x.slug === sub) ? sub : null, params: new URLSearchParams(location.search) };
}

// Enlaces antiguos con #/seccion?filtros se convierten a la ruta limpia.
if (location.hash.startsWith('#/')) {
  const [path, qs] = location.hash.slice(2).split('?');
  const [sec] = path.split('/');
  history.replaceState(null, '', `${pathFor(SECTIONS[sec] ? sec : 'inicio')}${qs ? `?${qs}` : ''}`);
}

function filtersFor(section, params) {
  const out = {};
  for (const f of section.filters || []) {
    const v = params.get(f.id);
    out[f.id] = f.options.some(o => String(o.value) === v) ? v : f.default;
  }
  return out;
}

// Menú: secciones con sus subsecciones (encabezados) como enlaces internos; se despliegan en la sección activa.
nav.innerHTML = NAV.map(n => {
  const subs = SUBS[n.id] || [];
  const list = subs.length ? `<ul class="nav-sub">${subs.map(s => `<li><a href="${pathFor(n.id, s.slug)}" data-id="${n.id}" data-sub="${s.slug}">${escapeHtml(s.title)}</a></li>`).join('')}</ul>` : '';
  return `<li class="nav-item" data-id="${n.id}"><a href="${pathFor(n.id)}" data-id="${n.id}" title="${n.label}"><svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">${n.icon}</svg><span class="nav-label">${n.label}</span></a>${list}</li>`;
}).join('');

let current = { id: null, sub: null, search: null };

function render() {
  const { id, params } = parseRoute();
  const section = SECTIONS[id];
  const filters = filtersFor(section, params);
  for (const li of nav.querySelectorAll('.nav-item')) li.classList.toggle('current', li.dataset.id === id);
  for (const a of nav.querySelectorAll(':scope > li > a')) a.setAttribute('aria-current', a.dataset.id === id ? 'page' : 'false');
  renderSection(section, main, {
    filters,
    onFilterChange(key, value) {
      filters[key] = value;
      const qs = new URLSearchParams(filters).toString();
      history.replaceState(null, '', `${pathFor(id, parseRoute().sub)}${qs ? `?${qs}` : ''}`);
      current.search = location.search;
      render();
    },
  });
  observeHeadings();
}

function setTitle(id, sub) {
  const label = NAV.find(n => n.id === id)?.label;
  const subTitle = SUBS[id].find(s => s.slug === sub)?.title;
  document.title = id === 'inicio' ? 'Datavilleta · Villeta en datos' : `${subTitle ? `${subTitle} · ` : ''}${label} · Datavilleta`;
}

// Desplazamiento a una subsección. Las tarjetas de arriba cargan después y cambian de alto: el navegador
// conserva la posición (scroll anchoring) y además se reajusta una vez si el usuario no se ha movido.
let userScrolled = false;
for (const ev of ['wheel', 'touchstart', 'keydown']) window.addEventListener(ev, () => { userScrolled = true; }, { passive: true });
function scrollToSub(sub, smooth) {
  const target = document.getElementById(`h-${sub}`);
  if (!target) return;
  userScrolled = false;
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  setActiveSub(sub);
  setTimeout(() => { if (!userScrolled) target.scrollIntoView({ behavior: 'auto', block: 'start' }); }, 1500);
}

function route({ smooth = false } = {}) {
  const { id, sub } = parseRoute();
  const sectionChanged = id !== current.id || location.search !== current.search;
  if (sectionChanged) render();
  setTitle(id, sub);
  if (sub) scrollToSub(sub, smooth && !sectionChanged);
  else if (sectionChanged || current.sub) window.scrollTo({ top: 0, behavior: smooth && !sectionChanged ? 'smooth' : 'auto' });
  current = { id, sub, search: location.search };
}

// Subsección visible: la última cuyo encabezado ya pasó bajo la barra superior se resalta en el menú.
let heads = [];
function setActiveSub(sub) {
  for (const a of nav.querySelectorAll('.nav-sub a')) a.classList.toggle('active', !!sub && a.dataset.sub === sub && a.closest('.nav-item').classList.contains('current'));
}
function updateActiveSub() {
  let act = null;
  for (const h of heads) {
    if (h.getBoundingClientRect().top > 160) break;
    act = h.dataset.sub;
  }
  setActiveSub(act);
}
function observeHeadings() {
  heads = [...main.querySelectorAll('.block-heading[data-sub]')];
  updateActiveSub();
}
window.addEventListener('scroll', updateActiveSub, { passive: true });

// Navegación interna sin recargar la página.
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;
  const raw = a.getAttribute('href') || '';
  if (raw.startsWith('#')) {
    // Enlace a un elemento de la página (p. ej. "Saltar al contenido"): sin cambiar la URL.
    const el = document.getElementById(raw.slice(1));
    if (el) { e.preventDefault(); el.focus({ preventScroll: true }); el.scrollIntoView(); }
    return;
  }
  const url = new URL(a.href, location.href);
  const last = url.pathname.split('/').pop();
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE) || last.includes('.')) return;
  e.preventDefault();
  // Dentro de la misma sección se conservan los filtros elegidos.
  if (!url.search && url.pathname.slice(BASE.length).split('/')[0] === current.id) url.search = location.search;
  if (url.pathname + url.search !== location.pathname + location.search) history.pushState(null, '', url.pathname + url.search);
  route({ smooth: true });
  document.body.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
});
window.addEventListener('popstate', () => route());

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
navToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(open));
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

route();
