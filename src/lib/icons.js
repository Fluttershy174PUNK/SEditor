// Иконки как чистые геометрические контуры в сетке 16×16.
// Формат — компактные примитивы, которые рисует PixelIcon.svelte:
//   ['rect', x, y, w, h]            — прямоугольник
//   ['line', x1, y1, x2, y2]        — отрезок
//   ['circle', cx, cy, r]           — круг
//   ['ellipse', cx, cy, rx, ry]     — эллипс
//   ['poly', [[x,y], ...], fill?]   — многоугольник (fill=true — залить)
//   ['path', d]                     — произвольный контур
//   ['dot', cx, cy, r]              — залитая точка
// Флаг dashed у иконки рисует её штриховой (для зоны).

const R = (x, y, w, h) => ['rect', x, y, w, h];
const L = (x1, y1, x2, y2) => ['line', x1, y1, x2, y2];
const P = (points, fill = false) => ['poly', points, fill];
const D = (d) => ['path', d];

export const ICONS = {
  // --- фигуры: ровно те же формы, что рисуются на холсте ---
  square: { prims: [R(2, 2, 12, 12)] },
  rect: { prims: [R(1, 4, 14, 8)] },
  circle: { prims: [['circle', 8, 8, 6]] },
  ellipse: { prims: [['ellipse', 8, 8, 7, 4.5]] },
  diamond: { prims: [P([[8, 1], [15, 8], [8, 15], [1, 8]])] },
  hexagon: { prims: [P([[5, 2], [11, 2], [15, 8], [11, 14], [5, 14], [1, 8]])] },
  triangle: { prims: [P([[8, 2], [15, 14], [1, 14]])] },

  // --- особые элементы ---
  label: { prims: [L(3, 4, 13, 4), L(8, 4, 8, 13)] },
  table: { prims: [R(1, 2, 14, 12), L(1, 7, 15, 7), L(6, 2, 6, 14), L(11, 2, 11, 14)] },

  // --- разметка поля ---
  zone: { prims: [R(1, 1, 14, 14)], dashed: true },
  level: { prims: [L(1, 8, 15, 8)] },
  stage: { prims: [L(8, 1, 8, 15)] },

  // --- файлы ---
  folder: { prims: [D('M2 4 H6.5 L7.5 6 H14 V13 H2 Z')] },
  file: { prims: [D('M4 2 H9.5 L12 4.5 V14 H4 Z'), L(9.5, 2, 9.5, 4.5), L(9.5, 4.5, 12, 4.5)] },

  // --- действия ---
  undo: { prims: [D('M6 4 L2 8 L6 12'), D('M2 8 H10 A3 3 0 0 1 13 11 V13')] },
  redo: { prims: [D('M10 4 L14 8 L10 12'), D('M14 8 H6 A3 3 0 0 0 3 11 V13')] },
  grid: { prims: [R(1, 1, 14, 14), L(8, 1, 8, 15), L(1, 8, 15, 8)] },
  snap: {
    prims: [['dot', 8, 8, 1.6], L(8, 1, 8, 5), L(8, 11, 8, 15), L(1, 8, 5, 8), L(11, 8, 15, 8)]
  },
  open: { prims: [D('M2 5 V13 H14 V6 H8 L6 3 H2 Z')] },
  save: {
    prims: [D('M2 2 H11 L14 5 V14 H2 Z'), R(5, 2, 5, 4), R(5, 9, 6, 5)]
  },
  saveAs: {
    prims: [D('M2 2 H9 L12 5 V9'), D('M2 2 V14 H9'), R(5, 2, 4, 4), R(5, 9, 4, 5), L(14, 6, 14, 13), L(12, 11, 14, 13)]
  },
  png: { prims: [R(1, 2, 14, 12), ['circle', 5.5, 6, 1.5], D('M1 13 L6 8 L10 12 L12 10 L15 13')] },
  list: { prims: [L(6, 4, 14, 4), L(6, 8, 14, 8), L(6, 12, 14, 12), ['dot', 2.5, 4, 1.3], ['dot', 2.5, 8, 1.3], ['dot', 2.5, 12, 1.3]] },
  plus: { prims: [L(8, 3, 8, 13), L(3, 8, 13, 8)] },
  minus: { prims: [L(3, 8, 13, 8)] },
  fit: {
    prims: [D('M2 6 V2 H6'), D('M10 2 H14 V6'), D('M14 10 V14 H10'), D('M6 14 H2 V10')]
  },
  copy: { prims: [R(2, 2, 9, 9), R(5, 5, 9, 9)] },
  cursor: { prims: [P([[4, 2], [4, 13], [7, 10], [9, 14], [11, 13], [9, 9], [13, 9]], true)] }
};

/** Примитивы иконки + признак штриховой обводки. */
export const iconFor = (name) => ICONS[name] || ICONS.rect;
export const ICON_VIEWBOX = 16;
