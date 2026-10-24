// Motor de tarjetas: cada bloque de una sección se dibuja como tarjeta con su gráfico/tabla,
// la cita de la fuente (entidad, conjunto, fecha de actualización) y los enlaces a la API usada.
import { SOURCES } from './sources.js';
import { MUNICIPIO } from './config.js';
import { query, metadata, datasetUrl, resourceUrl } from './soda.js';
import { drawChart, hbarHeight } from './charts.js';
import { getFormat, escapeHtml, fecha, signedPct } from './format.js';
import { describe, ofYear, ofDate, CRITERIO } from './freshness.js';

const charts = new Set();

export function destroyCharts() {
  for (const c of charts) c.destroy();
  charts.clear();
}

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

// ---------- tablas ----------
export function renderTable({ columns, rows }, { maxHeight } = {}) {
  const wrap = el('div', 'table-wrap');
  if (maxHeight) wrap.style.maxHeight = `${maxHeight}px`;
  const t = el('table', 'data-table');
  const head = columns.map(c => `<th scope="col" class="${c.align === 'right' ? 'num' : ''}">${escapeHtml(c.label)}</th>`).join('');
  const body = rows.map(r => `<tr>${columns.map(c => {
    const raw = r[c.key];
    const val = c.format ? getFormat(c.format)(raw, r) : raw;
    const html = c.html ? c.html(raw, r) : escapeHtml(val ?? '—');
    return `<td class="${c.align === 'right' ? 'num' : ''}">${html}</td>`;
  }).join('')}</tr>`).join('');
  t.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}" class="muted">Sin registros</td></tr>`}</tbody>`;
  wrap.append(t);
  return wrap;
}

function tableFromChart(spec, labelTitle = 'Período') {
  const columns = [{ key: '_l', label: labelTitle }, ...spec.series.map((s, i) => ({ key: `s${i}`, label: s.name, format: spec.format, align: 'right' }))];
  const rows = spec.labels.map((l, j) => Object.fromEntries([['_l', l], ...spec.series.map((s, i) => [`s${i}`, s.data[j]])]));
  return { columns, rows };
}

function toCsv({ columns, rows }) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(c => esc(c.label)).join(';'), ...rows.map(r => columns.map(c => esc(r[c.key])).join(';'))].join('\n');
}

function downloadCsv(table, name) {
  const blob = new Blob([`﻿${toCsv(table)}`], { type: 'text/csv;charset=utf-8' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.csv`;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- cita de fuentes ----------
async function sourceLine(key) {
  const s = SOURCES[key];
  const li = el('li', 'source');
  if (!s) { li.textContent = key; return li; }
  li.innerHTML = `<span class="source-entity">${escapeHtml(s.entidad)}</span> — <a href="${datasetUrl(s.id)}" target="_blank" rel="noopener">${escapeHtml(s.nombre)}</a> <span class="muted">(${s.id})</span><span class="source-date muted"></span>`;
  metadata(s.id).then(m => {
    if (m?.rowsUpdatedAt) li.querySelector('.source-date').textContent = ` · Actualizado en el portal: ${fecha(m.rowsUpdatedAt)}`;
  }).catch(() => {});
  return li;
}

// ---------- KPI ----------
// Acepta indicadores ya calculados o promesas: cada tile se pinta cuando su fuente responde.
function renderKpis(kpis) {
  const grid = el('div', 'kpi-grid');
  for (const item of kpis) {
    const tile = el('div', 'kpi');
    grid.append(tile);
    if (item && typeof item.then === 'function') {
      tile.classList.add('kpi-pending');
      tile.innerHTML = '<div class="kpi-label"><span class="spinner" aria-hidden="true"></span> Consultando…</div>';
      item.then(k => { tile.classList.remove('kpi-pending'); fillKpi(tile, k); }).catch(err => { console.warn('Indicador no disponible', err); tile.remove(); });
    } else {
      fillKpi(tile, item);
    }
  }
  return grid;
}

function fillKpi(tile, k) {
  {
    let delta = '';
    if (k.delta != null && Number.isFinite(k.delta)) {
      const up = k.delta > 0;
      const flat = k.delta === 0;
      const good = flat ? null : (k.goodWhen === 'down' ? !up : k.goodWhen === 'up' ? up : null);
      const cls = good == null ? 'neutral' : good ? 'good' : 'bad';
      const icon = flat ? '●' : up ? '▲' : '▼';
      delta = `<div class="kpi-delta ${cls}"><span aria-hidden="true">${icon}</span> ${signedPct(k.delta)} <span class="muted">${escapeHtml(k.deltaLabel || '')}</span></div>`;
    }
    const f = describe(k.asOf);
    const asof = f ? `<div class="kpi-asof st-${f.status}" title="${escapeHtml(CRITERIO)}">Dato: <strong>${escapeHtml(f.text)}</strong> · <span><span aria-hidden="true">${f.icon}</span> ${f.label}</span></div>` : '';
    tile.innerHTML = `<div class="kpi-label">${escapeHtml(k.label)}</div><div class="kpi-value">${escapeHtml(k.value)}</div>${delta}${k.hint ? `<div class="kpi-hint">${escapeHtml(k.hint)}</div>` : ''}${asof}${k.source ? `<div class="kpi-source">Fuente: ${escapeHtml(SOURCES[k.source]?.entidad || k.source)}</div>` : ''}`;
    if (k.href) {
      const a = el('a', 'kpi-link');
      a.href = k.href;
      a.append(...tile.childNodes);
      tile.append(a);
    }
  }
}

// ---------- tarjeta ----------
export function renderBlock(block, grid, filters) {
  if (block.type === 'heading') {
    const h = el('div', 'block-heading');
    h.innerHTML = `<h2>${escapeHtml(block.title)}</h2>${block.text ? `<p>${block.text}</p>` : ''}`;
    grid.append(h);
    return;
  }
  if (block.type === 'html') {
    grid.append(el('div', `block-html${block.wide ? ' wide' : ''}`, block.html));
    return;
  }
  const card = el('article', `card${block.wide ? ' wide' : ''}${block.type === 'kpis' ? ' card-kpis' : ''}`);
  card.innerHTML = `<header class="card-head"><div class="card-titles"><h3>${escapeHtml(block.title)}</h3>${block.subtitle ? `<p class="card-sub">${escapeHtml(block.subtitle)}</p>` : ''}</div><div class="asof-slot"></div></header>`;
  const asofSlot = card.querySelector('.asof-slot');
  const body = el('div', 'card-body');
  body.innerHTML = '<div class="loading"><span class="spinner" aria-hidden="true"></span> Consultando la fuente oficial…</div>';
  const footer = el('footer', 'card-foot');
  card.append(body, footer);
  grid.append(card);

  const used = [];
  const ctx = {
    M: MUNICIPIO,
    filters,
    async q(key, params) {
      const s = SOURCES[key];
      if (!s) throw new Error(`Fuente desconocida: ${key}`);
      used.push({ key, url: resourceUrl(s.id, params) });
      return query(s.id, params);
    },
  };

  // Vigencia del dato en el encabezado: la declara cada bloque (res.asOf); si no, se deduce de
  // etiquetas anuales del gráfico o, en último caso, de la fecha de publicación en el portal.
  async function paintAsOf(res) {
    asofSlot.innerHTML = '';
    if (!res || res.asOf === false) return;
    let a = res.asOf;
    if (!a && res.chart?.labels?.length && res.chart.labels.every(l => /^\d{4}\*?$/.test(l))) a = ofYear(String(res.chart.labels.at(-1)).slice(0, 4));
    if (!a) {
      const key = [...(block.sources || []), ...used.map(u => u.key)][0];
      const m = key && await metadata(SOURCES[key].id).catch(() => null);
      a = m?.rowsUpdatedAt ? ofDate(m.rowsUpdatedAt, { kind: 'portal' }) : null;
    }
    const f = describe(a);
    if (!f) return;
    asofSlot.innerHTML = `<div class="asof st-${f.status}" title="${escapeHtml(CRITERIO)}"><span class="asof-when">${escapeHtml(f.prefix)}: <strong>${escapeHtml(f.text)}</strong></span><span class="asof-status"><span aria-hidden="true">${f.icon}</span> ${f.label}</span></div>`;
  }

  const run = async () => {
    used.length = 0;
    asofSlot.innerHTML = '';
    body.innerHTML = '<div class="loading"><span class="spinner" aria-hidden="true"></span> Consultando la fuente oficial…</div>';
    try {
      const res = await block.load(ctx);
      body.innerHTML = '';
      paintAsOf(res);
      await paint(res);
    } catch (err) {
      console.error(block.title, err);
      body.innerHTML = '';
      const e = el('div', 'error', `No se pudo cargar la información: ${escapeHtml(err.message)}. `);
      const retry = el('button', 'btn-link', 'Reintentar');
      retry.type = 'button';
      retry.onclick = run;
      e.append(retry);
      body.append(e);
      await paintFooter(null);
    }
  };

  async function paint(res) {
    if (!res || res.empty) {
      body.append(el('div', 'empty', escapeHtml(res?.emptyText || `La fuente no reporta registros para ${MUNICIPIO.nombre}.`)));
      await paintFooter(res);
      return;
    }
    if (res.kpis) {
      body.append(renderKpis(res.kpis));
      // Las fuentes de indicadores asíncronos se conocen al terminar: se actualiza el pie entonces.
      if (res.kpis.some(k => typeof k?.then === 'function')) Promise.allSettled(res.kpis).then(() => paintFooter(res, res.table));
    }
    let table = res.table;
    if (res.chart) {
      const spec = res.chart;
      const box = el('div', 'chart-box');
      const height = spec.height || ((spec.kind === 'hbar' || spec.kind === 'hstacked') ? hbarHeight(spec.labels.length) : 280);
      box.style.height = `${height}px`;
      const canvas = el('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${block.title}. Use el botón Tabla para ver los valores.`);
      box.append(canvas);
      body.append(box);
      charts.add(drawChart(canvas, spec));
      table ||= tableFromChart(spec, res.labelTitle);
      const tableBox = renderTable(table, { maxHeight: 360 });
      tableBox.hidden = true;
      tableBox.classList.add('chart-table');
      body.append(tableBox);
    } else if (table) {
      body.append(renderTable(table, { maxHeight: res.maxHeight || 460 }));
    }
    if (res.html) body.append(el('div', 'card-html', res.html));
    if (res.note || block.note) body.append(el('p', 'note', res.note || block.note));
    await paintFooter(res, table);
  }

  async function paintFooter(res, table) {
    footer.innerHTML = '';
    const keys = [...new Set([...(block.sources || []), ...used.map(u => u.key)])];
    const list = el('ul', 'sources');
    list.append(...await Promise.all(keys.map(sourceLine)));
    // Citas adicionales (documentos sin API): fijas en el bloque o devueltas por la consulta.
    const extra = [block.sourceText, ...(res?.sourceText ? [].concat(res.sourceText) : [])].filter(Boolean);
    for (const t of extra) list.append(el('li', 'source', t));
    const label = el('div', 'sources-label', keys.length + extra.length > 1 ? 'Fuentes' : 'Fuente');
    footer.append(label, list);

    const actions = el('div', 'card-actions');
    if (res?.chart && table) {
      const tbtn = el('button', 'btn-ghost', 'Ver tabla');
      tbtn.type = 'button';
      tbtn.setAttribute('aria-pressed', 'false');
      tbtn.onclick = () => {
        const tb = body.querySelector('.chart-table');
        const box = body.querySelector('.chart-box');
        const show = tb.hidden;
        tb.hidden = !show;
        box.hidden = show;
        tbtn.textContent = show ? 'Ver gráfico' : 'Ver tabla';
        tbtn.setAttribute('aria-pressed', String(show));
      };
      actions.append(tbtn);
    }
    if (table) {
      const cbtn = el('button', 'btn-ghost', 'Descargar CSV');
      cbtn.type = 'button';
      cbtn.onclick = () => downloadCsv(table, `villeta-${block.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}`);
      actions.append(cbtn);
    }
    if (used.length) {
      const det = el('details', 'api-links');
      det.innerHTML = `<summary>Consulta API (${used.length})</summary>`;
      const ul = el('ul');
      for (const u of used) {
        const li = el('li');
        li.innerHTML = `<a href="${escapeHtml(u.url)}" target="_blank" rel="noopener">${escapeHtml(decodeURIComponent(u.url.replace('https://www.datos.gov.co', '')))}</a>`;
        ul.append(li);
      }
      det.append(ul);
      actions.append(det);
    }
    footer.append(actions);
  }

  run();
}

// ---------- sección ----------
export function renderSection(section, root, { filters, onFilterChange }) {
  destroyCharts();
  root.innerHTML = '';
  const head = el('header', 'section-head');
  head.innerHTML = `<p class="eyebrow">${escapeHtml(section.eyebrow || 'Villeta, Cundinamarca')}</p><h1>${escapeHtml(section.title)}</h1>${section.intro ? `<p class="lead">${section.intro}</p>` : ''}`;
  root.append(head);

  if (section.filters?.length) {
    const bar = el('form', 'filters');
    bar.setAttribute('aria-label', 'Filtros de la sección');
    bar.onsubmit = e => e.preventDefault();
    for (const f of section.filters) {
      const id = `f-${section.id}-${f.id}`;
      const wrap = el('label', 'filter');
      wrap.htmlFor = id;
      wrap.innerHTML = `<span>${escapeHtml(f.label)}</span>`;
      const sel = el('select');
      sel.id = id;
      for (const o of f.options) {
        const opt = el('option');
        opt.value = o.value;
        opt.textContent = o.label;
        if (String(filters[f.id]) === String(o.value)) opt.selected = true;
        sel.append(opt);
      }
      sel.onchange = () => onFilterChange(f.id, sel.value);
      wrap.append(sel);
      bar.append(wrap);
    }
    root.append(bar);
  }

  const grid = el('div', 'grid');
  root.append(grid);
  for (const block of section.blocks) renderBlock(block, grid, filters);
}
