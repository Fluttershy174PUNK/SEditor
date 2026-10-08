// Чистая геометрия: границы узлов, зоны, уровни (горизонтальные) и стадии (вертикальные).
// Без зависимостей от Svelte — тестируется напрямую (см. geometry.test.js).
import { DIVIDERS, SHAPES, isDivider } from './config.js';

/** Размер узла: явный width/height важнее замеренного, иначе дефолт фигуры. */
export const nodeSize = (node) => ({
  width: node.width ?? node.measured?.width ?? SHAPES[node.data?.shape]?.w ?? 100,
  height: node.height ?? node.measured?.height ?? SHAPES[node.data?.shape]?.h ?? 60
});

/** Прямоугольник узла в координатах поля. */
export const nodeRect = (node) => {
  const { width, height } = nodeSize(node);
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  return { x, y, width, height, x2: x + width, y2: y + height };
};

/** Пересекаются ли прямоугольники (касание — уже пересечение). */
export const rectsOverlap = (a, b) => a.x < b.x2 && a.x2 > b.x && a.y < b.y2 && a.y2 > b.y;

/** Полностью ли a внутри b. */
export const rectContains = (a, b) => a.x >= b.x && a.y >= b.y && a.x2 <= b.x2 && a.y2 <= b.y2;

/** Прямоугольник всех узлов (для рисования линий разделителей во всё поле). */
export function nodesBounds(nodes) {
  const content = nodes.filter((n) => !isDivider(n.data?.shape));
  // Пусто или одни разделители — поле стандартное: иначе линии дёргаются
  // при перетаскивании самих разделителей (границы считались бы по их ручкам).
  if (!content.length) return { x: 0, y: 0, x2: 1000, y2: 700 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of content) {
    const r = nodeRect(n);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x2);
    maxY = Math.max(maxY, r.y2);
  }
  return { x: minX, y: minY, x2: maxX, y2: maxY };
}

/** Ось разделителя в координатах поля: у уровня — Y, у стадии — X. */
export const dividerAxis = (node) => {
  const r = nodeRect(node);
  return DIVIDERS[node.data?.shape] === 'horizontal' ? r.y + r.height / 2 : r.x + r.width / 2;
};

/**
 * Полосы одной оси (у уровней — сверху вниз, у стадий — слева направо).
 * Каждая линия именует полосу СВОЕЙ стороны: у уровня — сверху от себя (labelPos
 * 'top', дефолт), у стадии — слева от себя ('left', дефолт); переключатель
 * стороны в инспекторе меняет именуемую полосу и положение подписи.
 * Значение полосы — имя линии (label), иначе её номер (1..N по порядку оси).
 * Полоса, которую не именует ни одна линия (снизу от последнего уровня / справа
 * от последней стадии), = None — до появления следующей линии.
 * У объекта ровно одно значение каждой оси; объект «на линии» — ниже (правее) её.
 */
function axisBands(lines, horizontal) {
  const sorted = [...lines].sort((a, b) => dividerAxis(a) - dividerAxis(b));
  const axes = sorted.map(dividerAxis);
  const afterSide = horizontal ? 'bottom' : 'right';
  const claims = new Map(); // индекс полосы -> { id, value }
  sorted.forEach((line, i) => {
    const value = (line.data?.label || '').trim() || i + 1;
    const after = (line.data?.labelPos ?? (horizontal ? 'top' : 'left')) === afterSide;
    const band = after ? i + 1 : i;
    if (!claims.has(band)) claims.set(band, { id: line.id, value });
  });
  const bands = Array.from({ length: sorted.length + 1 }, (_, band) => ({
    id: claims.get(band)?.id ?? null,
    value: claims.get(band)?.value ?? null,
    objects: []
  }));
  return { axes, bands };
}

/** Индекс полосы для точки центра: сколько осей не выше центра (на линии — после неё). */
const bandAt = (axes, center) => axes.reduce((n, a) => n + (a <= center ? 1 : 0), 0);

/**
 * Взаимосвязи схемы: зоны (их может быть несколько) и значения полос уровней
 * и стадий (ровно по одному значению на ось, см. axisBands).
 * @returns {{
 *   zones: Record<string, string[]>,   // nodeId -> [zoneId]
 *   zonesOf: Record<string, string[]>, // zoneId -> [nodeId]
 *   level: Record<string, 0|number|string>, // nodeId -> полоса уровней
 *   stage: Record<string, 0|number|string>, // nodeId -> полоса стадий
 *   bands: { level: object[], stage: object[] }, // полосы по порядку оси: {id, value, objects}
 *   objects: object[]
 * }}
 */
export function computeMembership(nodes) {
  const visible = nodes.filter((n) => !n.hidden);
  const zones = visible.filter((n) => n.data?.shape === 'zone');
  const levels = visible.filter((n) => n.data?.shape === 'level');
  const stages = visible.filter((n) => n.data?.shape === 'stage');
  const objects = visible.filter((n) => !isDivider(n.data?.shape) && n.data?.shape !== 'zone');

  const zonesFor = {}; // nodeId -> [zoneId]
  const zonesOf = {}; // zoneId -> [nodeId]

  for (const zone of zones) {
    const zr = nodeRect(zone);
    const inside = [];
    for (const object of objects) {
      if (rectsOverlap(nodeRect(object), zr)) {
        inside.push(object.id);
        (zonesFor[object.id] ||= []).push(zone.id);
      }
    }
    zonesOf[zone.id] = inside;
  }

  const level = {};
  const stage = {};
  const bandOf = (axes, bands, r, horizontal) => bands[bandAt(axes, horizontal ? r.y + r.height / 2 : r.x + r.width / 2)];
  const lv = axisBands(levels, true);
  const st = axisBands(stages, false);
  for (const object of objects) {
    const r = nodeRect(object);
    const bandL = bandOf(lv.axes, lv.bands, r, true);
    const bandS = bandOf(st.axes, st.bands, r, false);
    level[object.id] = bandL.value;
    stage[object.id] = bandS.value;
    if (bandL.id) bandL.objects.push(object.id);
    if (bandS.id) bandS.objects.push(object.id);
  }

  return {
    zones: zonesFor,
    zonesOf,
    level,
    stage,
    bands: { level: lv.bands, stage: st.bands },
    objects
  };
}

/** Записывает взаимосвязи в data узлов перед сохранением. */
export function applyMembership(nodes) {
  const { zones, level, stage, zonesOf } = computeMembership(nodes);
  return nodes.map((n) => {
    const data = { ...(n.data || {}) };
    if (n.data?.shape === 'zone') {
      // Зона хранит, что в неё входит.
      data.contains = zonesOf[n.id] || [];
    } else if (!isDivider(n.data?.shape)) {
      // Обычные объекты хранят зоны и значения полос уровней/стадий:
      // имя полосы (или её номер), иначе None — вне линий.
      data.zones = zones[n.id] || [];
      data.level = level[n.id] ?? null;
      data.stage = stage[n.id] ?? null;
    }
    return { ...n, data };
  });
}
