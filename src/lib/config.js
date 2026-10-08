// Единственный источник правды по фигурам, стилям и уровням.
// Дефолтные размеры/точки выхода тут, чтобы палитра и узлы не расходились.

// 4 грани: метка входа/выхода по центру каждой стороны.
export const SIDES = ['top', 'right', 'bottom', 'left'];

// Обратные стороны — для кнопки «развернуть связь».
export const OPPOSITE = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };

const min = 12;

export const SHAPES = {
  square: { icon: 'square', w: 96, h: 96, minW: min, minH: min, maxW: 4000, maxH: 4000, sizeLocked: true },
  rect: { icon: 'rect', w: 160, h: 80, minW: min, minH: min, maxW: 4000, maxH: 4000 },
  circle: { icon: 'circle', w: 96, h: 96, minW: min, minH: min, maxW: 4000, maxH: 4000, sizeLocked: true, round: true },
  ellipse: { icon: 'ellipse', w: 160, h: 96, minW: min, minH: min, round: true, maxW: 4000, maxH: 4000 },
  diamond: { icon: 'diamond', w: 112, h: 112, minW: min, minH: min, sizeLocked: true },
  hexagon: { icon: 'hexagon', w: 140, h: 96, minW: min, minH: min, maxW: 4000, maxH: 4000 },
  triangle: { icon: 'triangle', w: 120, h: 104, minW: min, minH: min, maxW: 4000, maxH: 4000 },
  label: { icon: 'label', w: 140, h: 32, minW: 24, minH: 20, maxW: 4000, maxH: 4000 },
  table: { icon: 'table', w: 240, h: 120, minW: 40, minH: 40, maxW: 4000, maxH: 4000 },
  zone: { icon: 'zone', w: 280, h: 200, minW: 24, minH: 24, maxW: 20000, maxH: 20000 },
  // Разделители: тонкая «ручка», сама линия рисуется через всё поле.
  level: { icon: 'level', w: 180, h: 14, minW: 60, minH: 14, maxW: 400, maxH: 14, divider: 'horizontal' },
  stage: { icon: 'stage', w: 14, h: 180, minW: 14, minH: 60, maxW: 14, maxH: 400, divider: 'vertical' }
};

// Фигуры-разделители: уровень — горизонтальная линия, стадия — вертикальная.
// Линия тянется через всё поле, а узел служит ручкой для перетаскивания.
export const DIVIDERS = { level: 'horizontal', stage: 'vertical' };

export const isDivider = (shape) => shape in DIVIDERS;

// Тип узла для рендера по имени фигуры.
export const FLOW_TYPES = {
  square: 'shape',
  rect: 'shape',
  circle: 'shape',
  ellipse: 'shape',
  diamond: 'shape',
  hexagon: 'shape',
  triangle: 'shape',
  label: 'text',
  table: 'table',
  zone: 'zone',
  level: 'divider',
  stage: 'divider'
};

export const PALETTE = {
  shapes: ['square', 'rect', 'circle', 'ellipse', 'diamond', 'hexagon', 'triangle'],
  special: ['label', 'table'],
  layout: ['zone', 'level', 'stage']
};

// MIME типа drag'n'drop из палитры на холст (producer — Palette, consumer — FlowCanvas).
export const SHAPE_MIME = 'application/seditor-shape';

export const LABEL_POSITIONS = ['inside', 'top', 'right', 'bottom', 'left'];

export const DEFAULT_LINE = { stroke: '#e6eef5', width: 2, dash: 'solid', marker: 'none' };
export const LINE_DASHES = ['solid', 'dashed', 'dotted'];
export const LINE_MARKERS = ['none', 'arrow', 'triangle', 'circle'];
export const EDGE_STYLES = ['straight', 'step', 'smoothstep'];
export const ARROWS = ['none', 'end', 'start', 'both'];

export const BORDER_STYLES = ['solid', 'dashed', 'dotted'];

export const MAX_HISTORY = 50;

export const defaultData = (shape) => ({
  shape,
  label: '',
  labelPos: 'inside',
  desc: '',
  // Зоны: прозрачный контейнер с пунктиром/рамкой (fill пустой = дефолтная подсветка).
  ...(shape === 'zone' ? { border: 'dashed', fill: '', stroke: '#5c6b7a' } : {}),
  // Разделители: цвет и тип линии; подпись именует полосу своей стороны —
  // у уровня сверху от себя, у стадии слева (дефолт) — отсюда её сторона.
  ...(isDivider(shape) ? { stroke: '#7c8b9a', dash: 'dashed', thickness: 2, labelPos: shape === 'stage' ? 'left' : 'top' } : {}),
  // Таблица: данные ячеек "строка,колонка" -> текст (по двойному клику).
  ...(shape === 'table' ? { cols: 3, rows: 3, header: true, cells: {} } : {})
});

// Слои: зоны — самый низ, разделители над ними, обычные объекты сверху.
// Без явного zIndex порядок остаётся «по порядку создания», как и был.
export const zIndexOf = (shape) => {
  if (shape === 'zone') return -2;
  if (isDivider(shape)) return -1;
  return undefined;
};

/** Пошаговое смещение по сетке. */
export const snapAxis = (value, snap) => (snap ? Math.round(value / 8) * 8 : Math.round(value));

export const sizeFor = (shape) => ({ width: SHAPES[shape].w, height: SHAPES[shape].h });

// Ограничение размера: у круга и квадрата держим пропорцию 1:1.
// Эллипс и прямоугольник свободные. У разделителей свободна только «длина»
// линии (ширина уровня, высота стадии) — вторая ось зажата min=max в конфиге.
export const clampSize = (shape, w, h) => {
  const s = SHAPES[shape];
  let width = Math.min(Math.max(w, s.minW), s.maxW ?? 4000);
  let height = Math.min(Math.max(h, s.minH), s.maxH ?? 4000);
  if (s.sizeLocked) {
    const side = Math.min(width, height);
    width = side;
    height = side;
  }
  return { width, height };
};
