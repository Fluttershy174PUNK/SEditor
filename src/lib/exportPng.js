// PNG-экспорт без зависимостей: рисуем схему на canvas из тех же данных,
// что и на холсте (фигуры, надписи, связи, зоны, уровни, таблицы).
import { SHAPES, isDivider } from './config.js';
import { dividerAxis, nodeRect, nodesBounds } from './geometry.js';

const PAD = 40;
const FONT = 13;

const sidePoint = (rect, side) => {
  switch (side) {
    case 'top':
      return { x: rect.x + rect.width / 2, y: rect.y };
    case 'bottom':
      return { x: rect.x + rect.width / 2, y: rect.y2 };
    case 'left':
      return { x: rect.x, y: rect.y + rect.height / 2 };
    default:
      return { x: rect.x2, y: rect.y + rect.height / 2 };
  }
};

const drawArrow = (ctx, from, to, color, width) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 8 + width * 2.5;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 7), to.y - size * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 7), to.y - size * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
};

function shapePath(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'rect' || shape === 'label' || shape === 'table') {
    ctx.rect(r.x, r.y, r.width, r.height);
  } else if (shape === 'circle' || shape === 'ellipse' || shape === 'square') {
    ctx.ellipse(r.x + r.width / 2, r.y + r.height / 2, r.width / 2, r.height / 2, 0, 0, Math.PI * 2);
  } else if (shape === 'diamond') {
    ctx.moveTo(r.x + r.width / 2, r.y);
    ctx.lineTo(r.x2, r.y + r.height / 2);
    ctx.lineTo(r.x + r.width / 2, r.y2);
    ctx.lineTo(r.x, r.y + r.height / 2);
    ctx.closePath();
  } else if (shape === 'triangle') {
    ctx.moveTo(r.x + r.width / 2, r.y);
    ctx.lineTo(r.x2, r.y2);
    ctx.lineTo(r.x, r.y2);
    ctx.closePath();
  } else if (shape === 'hexagon') {
    ctx.moveTo(r.x + r.width * 0.25, r.y);
    ctx.lineTo(r.x + r.width * 0.75, r.y);
    ctx.lineTo(r.x2, r.y + r.height / 2);
    ctx.lineTo(r.x + r.width * 0.75, r.y2);
    ctx.lineTo(r.x + r.width * 0.25, r.y2);
    ctx.lineTo(r.x, r.y + r.height / 2);
    ctx.closePath();
  }
}

function drawLabel(ctx, text, r, pos) {
  ctx.fillStyle = '#d9e6f2';
  ctx.font = `${FONT}px ui-monospace, monospace`;
  const lines = String(text).split('\n');
  const lineH = FONT * 1.25;
  const totalH = lines.length * lineH;
  const center = { x: r.x + r.width / 2, y: r.y + r.height / 2 };

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (pos === 'inside') {
    lines.forEach((line, i) => ctx.fillText(line, center.x, r.y + r.height / 2 - totalH / 2 + lineH * (i + 0.5)));
  } else if (pos === 'top') {
    lines.forEach((line, i) => ctx.fillText(line, center.x, r.y - 6 - totalH + lineH * (i + 0.5)));
  } else if (pos === 'bottom') {
    lines.forEach((line, i) => ctx.fillText(line, center.x, r.y2 + 6 + lineH * (i + 0.5)));
  } else if (pos === 'left') {
    ctx.textAlign = 'right';
    ctx.fillText(lines.join('\n'), r.x - 6, center.y);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(lines.join('\n'), r.x2 + 6, center.y);
  }
}

function drawTable(ctx, r, data) {
  const cols = Math.max(1, data.cols ?? 3);
  const rows = Math.max(1, data.rows ?? 3);
  const total = rows + (data.header ? 1 : 0);
  ctx.fillStyle = '#1d2833';
  ctx.fillRect(r.x, r.y, r.width, r.height);
  ctx.strokeStyle = '#3b4a58';
  ctx.lineWidth = 1;
  for (let c = 1; c < cols; c += 1) {
    const x = r.x + (r.width / cols) * c;
    ctx.beginPath();
    ctx.moveTo(x, r.y);
    ctx.lineTo(x, r.y2);
    ctx.stroke();
  }
  for (let i = 1; i < total; i += 1) {
    const y = r.y + (r.height / total) * i;
    ctx.beginPath();
    ctx.moveTo(r.x, y);
    ctx.lineTo(r.x2, y);
    ctx.stroke();
  }
  if (data.header) {
    ctx.fillStyle = '#26333f';
    ctx.fillRect(r.x, r.y, r.width, r.height / total);
  }
  // Данные ячеек: ключ "строка,колонка" -> текст.
  const cells = data.cells || {};
  ctx.font = `${FONT - 3}px ui-monospace, monospace`;
  ctx.fillStyle = '#d9e6f2';
  ctx.textAlign = 'left';
  const cellH = r.height / total;
  const cellW = r.width / cols;
  for (let row = 0; row < total; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const text = cells[`${row},${col}`];
      if (text) ctx.fillText(text, r.x + col * cellW + 4, r.y + row * cellH + cellH / 2, cellW - 8);
    }
  }
  ctx.strokeStyle = '#6b7d8c';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.width, r.height);
}

function drawEdge(ctx, edge, rects) {
  const rt = rects.get(edge.target);
  const rs = rects.get(edge.source);
  if (!rs || !rt) return;
  const from = sidePoint(rs, edge.sourceHandle || 'right');
  const to = sidePoint(rt, edge.targetHandle || 'left');
  const data = edge.data || {};
  const color = data.stroke || '#cfe3f5';
  const width = Math.max(1, data.width ?? 2);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(data.dash === 'dashed' ? [8, 5] : data.dash === 'dotted' ? [2, 4] : []);
  ctx.beginPath();
  if (edge.type === 'step' || edge.type === 'smoothstep') {
    const mid = (from.x + to.x) / 2;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(mid, from.y);
    ctx.lineTo(mid, to.y);
    ctx.lineTo(to.x, to.y);
  } else {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
  ctx.restore();

  const arrow = data.arrow || 'end';
  const marker = data.marker || 'none';
  if (marker === 'arrow' || marker === 'triangle') {
    if (arrow === 'end' || arrow === 'both') drawArrow(ctx, from, to, color, width);
    if (arrow === 'start' || arrow === 'both') drawArrow(ctx, to, from, color, width);
  } else if (marker === 'circle') {
    for (const p of arrow === 'start' ? [from] : arrow === 'both' ? [from, to] : [to]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  if (data.label) {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    ctx.font = `${FONT - 2}px ui-monospace, monospace`;
    const w = ctx.measureText(data.label).width + 8;
    ctx.fillStyle = '#141c25';
    ctx.fillRect(mx - w / 2, my - 9, w, 16);
    ctx.fillStyle = '#d9e6f2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.label, mx, my);
  }
}

/** Рисует схему в offscreen-canvas и возвращает PNG dataURL. */
export function exportPng({ nodes, edges, title = '' }) {
  // Линии-разделители тянутся через всё поле, поэтому берём границы содержимого.
  const bounds = nodesBounds(nodes);
  const rects = new Map(nodes.map((n) => [n.id, nodeRect(n)]));

  const top = title ? 34 : 0;
  const width = Math.max(1, Math.ceil(bounds.x2 - bounds.x) + PAD * 2);
  const height = Math.max(1, Math.ceil(bounds.y2 - bounds.y) + PAD * 2 + top);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0a0e13';
  ctx.fillRect(0, 0, width, height);
  ctx.translate(PAD - bounds.x, PAD - bounds.y + top);
  ctx.textBaseline = 'middle';

  // Порядок: зоны → разделители → фигуры и таблицы → связи.
  const shapes = nodes.filter((n) => n.data?.shape === 'zone');
  const others = nodes.filter((n) => n.data?.shape !== 'zone' && !isDivider(n.data?.shape));

  for (const zone of shapes) {
    const r = rects.get(zone.id);
    const data = zone.data || {};
    ctx.save();
    ctx.setLineDash(data.border === 'dotted' ? [2, 4] : data.border === 'dashed' ? [8, 5] : []);
    ctx.strokeStyle = data.stroke || '#5c6b7a';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.width, r.height);
    ctx.restore();
    if (data.label) drawLabel(ctx, data.label, { ...r, y2: r.y + 18 }, 'top');
  }

  // Разделители: уровень — горизонталь, стадия — вертикаль, во всю ширину/высоту поля.
  for (const divider of nodes.filter((n) => isDivider(n.data?.shape))) {
    const data = divider.data || {};
    const axis = dividerAxis(divider);
    ctx.save();
    ctx.strokeStyle = data.stroke || '#7c8b9a';
    ctx.lineWidth = Math.max(1, data.thickness ?? 2);
    ctx.setLineDash(data.dash === 'dashed' ? [9, 6] : data.dash === 'dotted' ? [2, 5] : []);
    ctx.beginPath();
    if (SHAPES[data.shape].divider === 'horizontal') {
      ctx.moveTo(bounds.x - 20, axis);
      ctx.lineTo(bounds.x2 + 20, axis);
    } else {
      ctx.moveTo(axis, bounds.y - 20);
      ctx.lineTo(axis, bounds.y2 + 20);
    }
    ctx.stroke();
    ctx.restore();
    // Подпись разделителя — по центру линии на своей стороне:
    // уровень именует пространство сверху/снизу, стадия — справа/слева.
    if (data.label) {
      ctx.font = `${FONT - 2}px ui-monospace, monospace`;
      const vertical = SHAPES[data.shape].divider === 'vertical';
      const w = ctx.measureText(data.label).width + 8;
      const side = vertical ? (data.labelPos === 'right' ? 'right' : 'left') : data.labelPos === 'bottom' ? 'bottom' : 'top';
      const x = vertical ? (side === 'left' ? axis - 8 - w : axis + 8) : (bounds.x + bounds.x2) / 2 - w / 2;
      const y = vertical ? (bounds.y + bounds.y2) / 2 : side === 'bottom' ? axis + 16 : axis - 16;
      ctx.fillStyle = '#141c25';
      ctx.fillRect(x, y - 8, w, 16);
      ctx.fillStyle = '#d9e6f2';
      ctx.textAlign = 'left';
      ctx.fillText(data.label, x + 4, y);
    }
  }

  for (const node of others) {
    const r = rects.get(node.id);
    const data = node.data || {};
    if (data.shape === 'table') {
      drawTable(ctx, r, data);
    } else {
      shapePath(ctx, data.shape, r);
      ctx.fillStyle = '#1d2833';
      ctx.fill();
      ctx.strokeStyle = '#6b7d8c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (data.label) drawLabel(ctx, data.label, r, data.labelPos || 'inside');
  }

  for (const edge of edges) drawEdge(ctx, edge, rects);

  if (title) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#7ee6a5';
    ctx.font = `bold ${FONT + 3}px ui-monospace, monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(title, PAD, 20);
  }

  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}

// Отладочный хук: window.seditor.png() из консоли.
if (typeof window !== 'undefined') {
  window.seditor = { ...(window.seditor || {}), png: exportPng };
}
