// Envoltorio de Chart.js con las especificaciones visuales del sitio (barras finas con extremo
// redondeado, líneas de 2 px, grilla tenue, leyenda solo con 2+ series, tooltip con variación).
import { getFormat, signedPct, change, compact, MESES_CORTOS, MESES_LARGOS } from './format.js';

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function palette() {
  return {
    series: Array.from({ length: 8 }, (_, i) => cssVar(`--series-${i + 1}`)),
    text: cssVar('--text-primary'),
    text2: cssVar('--text-secondary'),
    muted: cssVar('--text-muted'),
    grid: cssVar('--grid'),
    axis: cssVar('--axis'),
    surface: cssVar('--surface-1'),
    border: cssVar('--border-strong'),
  };
}

function withAlpha(color, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const FONT = { family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', size: 12 };

/**
 * spec = {
 *   kind: 'bar' | 'hbar' | 'line' | 'stacked' | 'hstacked',
 *   labels: string[],
 *   series: [{ name, data: number[], color?: 0-7, muted?: bool }],
 *   format: 'num' | 'dec' | 'pct' | 'cop' | fn,
 *   partialLast: bool   // último período incompleto: barra atenuada
 *   yoy: bool           // tooltip muestra variación frente al período anterior
 *   threshold: { value, label }
 *   beginAtZero, min, max
 * }
 */
export function drawChart(canvas, spec) {
  const P = palette();
  const fmt = getFormat(spec.format);
  const horizontal = spec.kind === 'hbar' || spec.kind === 'hstacked';
  const stacked = spec.kind === 'stacked' || spec.kind === 'hstacked';
  const isLine = spec.kind === 'line';
  const n = spec.labels.length;
  // spec.timeline: [{y, m}] o [{y, q}] paralelo a labels (serie mensual/trimestral continua).
  // spec.months12: las etiquetas son los 12 meses y cada serie es un año (comparativo).
  const timeAxis = !horizontal && !!(spec.timeline || spec.months12);
  const isYearStart = i => !!spec.timeline && i > 0 && (spec.timeline[i]?.m === 1 || spec.timeline[i]?.q === 1);
  const periodName = i => {
    if (spec.months12) return MESES_LARGOS[i];
    const p = spec.timeline?.[i];
    if (!p) return spec.labels[i];
    return p.q ? `T${p.q} ${p.y} (${MESES_CORTOS[p.q * 3 - 3]}–${MESES_CORTOS[p.q * 3 - 1]})` : `${MESES_LARGOS[p.m - 1]} ${p.y}`;
  };
  const lastSeries = spec.series.length - 1;

  const datasets = spec.series.map((s, i) => {
    const color = s.muted ? P.muted : P.series[(s.color ?? i) % 8];
    if (isLine) {
      return {
        type: 'line', label: s.name, data: s.data,
        borderColor: color, backgroundColor: color,
        borderWidth: 2, borderJoinStyle: 'round', borderCapStyle: 'round', tension: 0, spanGaps: true,
        pointRadius: n > 36 ? 0 : 4, pointHoverRadius: 6, pointHitRadius: 14,
        pointBorderColor: P.surface, pointBorderWidth: 2,
      };
    }
    const fill = spec.partialLast ? spec.labels.map((_, j) => (j === n - 1 ? withAlpha(color, 0.38) : color)) : color;
    const gap = stacked ? (horizontal ? { right: 2 } : { top: 2 }) : 0;
    return {
      type: 'bar', label: s.name, data: s.data,
      backgroundColor: fill, hoverBackgroundColor: fill,
      borderColor: P.surface, borderWidth: gap,
      borderRadius: stacked && i !== lastSeries ? 0 : 4, borderSkipped: 'start',
      maxBarThickness: 24, categoryPercentage: 0.78, barPercentage: spec.series.length > 1 && !stacked ? 0.92 : 0.86,
    };
  });

  if (spec.threshold) {
    datasets.push({
      type: 'line', label: spec.threshold.label, data: spec.labels.map(() => spec.threshold.value),
      borderColor: P.axis, borderWidth: 1.5, pointRadius: 0, pointHitRadius: 0, tension: 0,
    });
  }

  const legendCount = datasets.length;
  const catAxis = horizontal ? 'y' : 'x';
  const valAxis = horizontal ? 'x' : 'y';
  // Valor directo en el extremo de la barra: barras horizontales de una serie, o columnas cuando son pocas.
  const tipLabels = spec.series.length === 1 && ((spec.kind === 'hbar' && n <= 25) || (spec.kind === 'bar' && n <= 6));

  const config = {
    data: { labels: spec.labels, datasets },
    plugins: tipLabels ? [{
      id: 'tipLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        ctx.font = `11px ${FONT.family}`;
        ctx.fillStyle = P.text2;
        meta.data.forEach((bar, i) => {
          const v = chart.data.datasets[0].data[i];
          if (v == null) return;
          if (horizontal) {
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(fmt(v), bar.x + 6, bar.y);
          } else {
            ctx.textAlign = 'center'; ctx.textBaseline = v < 0 ? 'top' : 'bottom';
            ctx.fillText(fmt(v), bar.x, v < 0 ? bar.y + 6 : bar.y - 6);
          }
        });
        ctx.restore();
      },
    }] : [],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      animation: { duration: 250 },
      interaction: isLine || stacked || spec.series.length > 1
        ? { mode: 'index', intersect: false, axis: catAxis }
        : { mode: 'nearest', intersect: false, axis: catAxis },
      layout: { padding: { top: tipLabels && !horizontal ? 22 : 4, right: tipLabels && horizontal ? 72 : 12, left: 0, bottom: tipLabels && !horizontal ? 16 : 0 } },
      plugins: {
        legend: {
          display: legendCount >= 2,
          position: 'top',
          align: 'start',
          labels: {
            color: P.text2, font: FONT, usePointStyle: true, boxWidth: 8, boxHeight: 8, padding: 14,
            // Muestra de color tomada de la serie (no del anillo del punto, que usa el color de superficie).
            generateLabels(chart) {
              return chart.data.datasets.map((ds, i) => ({
                text: ds.label, datasetIndex: i, hidden: !chart.isDatasetVisible(i),
                fillStyle: ds.type === 'line' ? ds.borderColor : (Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor),
                strokeStyle: 'transparent', lineWidth: 0, fontColor: P.text2,
                pointStyle: ds.type === 'line' ? 'circle' : 'rectRounded',
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: P.surface, titleColor: P.text, bodyColor: P.text2, footerColor: P.muted,
          borderColor: P.border, borderWidth: 1, padding: 10, cornerRadius: 6,
          usePointStyle: true, boxPadding: 4, titleFont: { ...FONT, weight: '600' }, bodyFont: FONT, footerFont: FONT,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed[valAxis];
              let out = `${ctx.dataset.label}: ${fmt(v)}`;
              if (spec.yoy && ctx.dataIndex > 0 && ctx.datasetIndex < spec.series.length) {
                const prev = ctx.dataset.data[ctx.dataIndex - 1];
                const c = change(v, prev);
                if (c != null) out += `  (${signedPct(c)} vs ${spec.labels[ctx.dataIndex - 1]})`;
              }
              return out;
            },
            footer(items) {
              if (spec.partialLast && items[0]?.dataIndex === n - 1) return 'Período en curso: datos parciales';
              return spec.footer ? spec.footer(items[0]?.dataIndex) : '';
            },
            ...(timeAxis ? { title: items => periodName(items[0]?.dataIndex) } : {}),
          },
        },
      },
      scales: {
        [catAxis]: {
          stacked,
          // Eje de tiempo mensual/trimestral: una línea guía vertical por periodo y una más marcada al iniciar cada año.
          grid: timeAxis
            ? { display: true, drawTicks: true, tickLength: 4, lineWidth: 1, color: c => (isYearStart(c.index) ? P.axis : P.grid) }
            : { display: false },
          border: { color: P.axis },
          ticks: {
            color: P.muted, font: timeAxis ? { ...FONT, size: 11 } : FONT, maxRotation: 0,
            autoSkip: !horizontal && !timeAxis, autoSkipPadding: 10,
            callback(value, index) {
              if (spec.months12) return MESES_CORTOS[index];
              if (spec.timeline) {
                const p = spec.timeline[index];
                return p ? [p.q ? `T${p.q}` : MESES_CORTOS[p.m - 1], String(p.y).slice(-2)] : '';
              }
              const label = String(this.getLabelForValue(value));
              const max = this.chart.width < 520 ? 18 : 34;
              return horizontal && label.length > max ? `${label.slice(0, max - 1)}…` : label;
            },
          },
        },
        [valAxis]: {
          stacked,
          beginAtZero: spec.beginAtZero ?? true,
          min: spec.min, max: spec.max,
          grid: { color: P.grid, lineWidth: 1, drawTicks: false },
          border: { display: false },
          ticks: {
            color: P.muted, font: FONT, padding: 8, maxRotation: 0,
            maxTicksLimit: horizontal && canvas.parentElement?.clientWidth < 520 ? 3 : 6,
            callback: v => (spec.format === 'pct' ? `${compact(v)} %` : spec.format === 'cop' ? `${v < 0 ? '−' : ''}$${compact(Math.abs(v))}` : compact(v)),
          },
        },
      },
    },
  };
  // eslint-disable-next-line no-undef
  return new Chart(canvas, config);
}

// Altura sugerida para barras horizontales según el número de categorías.
export const hbarHeight = n => Math.max(200, n * 30 + 70);
