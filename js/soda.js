// Cliente mínimo para la API SODA (Socrata) de datos.gov.co, con caché en memoria y en localStorage
// y un límite de consultas simultáneas para no saturar el portal.
import { SOCRATA, DISCOVERY, CACHE_HORAS } from './config.js';

const PREFIX = 'dv:v1:';
const TTL_MS = CACHE_HORAS * 3600 * 1000;
const MAX_CONCURRENT = 4;
const memory = new Map();
const waiting = [];
let running = 0;

function limited(fn) {
  return new Promise((resolve, reject) => {
    const task = async () => {
      running++;
      try { resolve(await fn()); } catch (e) { reject(e); } finally {
        running--;
        const next = waiting.shift();
        if (next) next();
      }
    };
    if (running < MAX_CONCURRENT) task(); else waiting.push(task);
  });
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t > TTL_MS ? null : v;
  } catch { return null; }
}

function cacheSet(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value })); } catch { /* almacenamiento lleno o bloqueado */ }
}

export function clearCache() {
  memory.clear();
  try {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
  } catch { /* sin acceso a localStorage */ }
}

async function fetchJson(url, { timeout = 90000, pick } = {}) {
  if (memory.has(url)) return memory.get(url);
  const cached = cacheGet(url);
  if (cached) return cached;
  const promise = limited(async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`El portal respondió HTTP ${res.status}`);
      const data = pick ? pick(await res.json()) : await res.json();
      cacheSet(url, data);
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('La consulta tardó demasiado (tiempo de espera agotado)');
      throw e;
    } finally { clearTimeout(timer); }
  });
  memory.set(url, promise);
  promise.catch(() => memory.delete(url));
  return promise;
}

export function resourceUrl(id, params = {}) {
  const url = new URL(`${SOCRATA}/resource/${id}.json`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  return url.toString();
}

export const datasetUrl = id => `${SOCRATA}/d/${id}`;

export function query(id, params) {
  return fetchJson(resourceUrl(id, params));
}

// Metadatos del conjunto: entidad que publica y fecha de la última actualización de filas.
export function metadata(id) {
  return fetchJson(`${SOCRATA}/api/views/${id}.json`, {
    pick: v => ({
      name: v.name,
      attribution: v.attribution || '',
      rowsUpdatedAt: v.rowsUpdatedAt || v.viewLastModified || null,
    }),
  });
}

// Búsqueda en el catálogo nacional (Discovery API) de conjuntos que mencionan un término.
export function discover(term, limit = 100) {
  const url = new URL(DISCOVERY);
  url.searchParams.set('domains', 'www.datos.gov.co');
  url.searchParams.set('q', term);
  url.searchParams.set('limit', limit);
  return fetchJson(url.toString(), {
    pick: d => d.results.map(r => ({
      id: r.resource.id,
      name: r.resource.name,
      type: r.resource.type,
      attribution: r.resource.attribution || '',
      updatedAt: r.resource.data_updated_at || r.resource.updatedAt,
    })),
  });
}
