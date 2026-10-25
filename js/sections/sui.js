// Información comercial del SUI (Superservicios): suscriptores, consumo, facturación, subsidios y
// contribuciones por prestador y servicio en Villeta. El cubo SUI_COMERCIAL es de consulta pública
// pero no tiene API, así que las cifras están transcritas en data/sui-comercial-villeta.json.
import { escapeHtml, fecha } from '../format.js';

let cache = null;
export function sui() {
  cache ??= fetch('data/sui-comercial-villeta.json', { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error('No se encontró data/sui-comercial-villeta.json');
    return r.json();
  }).catch(e => { cache = null; throw e; });
  return cache;
}

export const citaSui = d => `<span class="source-entity">${escapeHtml(d.fuente.entidad)}</span> — <a href="${escapeHtml(d.fuente.url)}" target="_blank" rel="noopener">${escapeHtml(d.fuente.sistema)}</a> <span class="muted">(${escapeHtml(d.fuente.filtros)}; consultado el ${fecha(`${d.fuente.consultado}T12:00:00`)}; cifras transcritas en data/sui-comercial-villeta.json)</span>`;

// Periodos {y, m} desde 'YYYY-MM' durante n meses.
export function meses(desde, n) {
  let [y, m] = desde.split('-').map(Number);
  return Array.from({ length: n }, () => {
    const p = { y, m };
    if (++m > 12) { m = 1; y++; }
    return p;
  });
}

export const periodoDe = s => { const [y, m] = s.split('-').map(Number); return { y, m }; };

export const prestador = (d, id, servicio) => d.prestadores.find(p => p.id === id && p.servicio === servicio);

// Años presentes en uno o varios objetos 'anual', ordenados.
export const aniosDe = (...anuales) => [...new Set(anuales.flatMap(a => Object.keys(a)))].sort();

export const SERVICIOS = { acueducto: 'Acueducto', alcantarillado: 'Alcantarillado', aseo: 'Aseo', energia: 'Energía eléctrica', gas_natural: 'Gas natural', glp: 'Gas licuado (GLP)', telefonia: 'Telefonía fija' };
