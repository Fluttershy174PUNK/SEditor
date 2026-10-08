// Формат файла схемы (SEditor schema v1).
// При сохранении взаимосвязи (зоны/уровни) пересчитываются и пишутся в data узлов.
import { clampSize, defaultData, FLOW_TYPES, isDivider, SHAPES, sizeFor, zIndexOf } from './config.js';
import { applyMembership } from './geometry.js';

export const SCHEMA_VERSION = 1;

export const emptySchema = () => ({ version: SCHEMA_VERSION, meta: {}, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } });

let counter = 0;
/** id узла: буква фигуры + счётчик (uuid тут избыточен). */
export const newNodeId = (shape) => {
  counter += 1;
  return `${FLOW_TYPES[shape] || 'n'}-${Date.now().toString(36)}-${counter.toString(36)}`;
};

export const edgeId = () => {
  counter += 1;
  return `e-${Date.now().toString(36)}-${counter.toString(36)}`;
};

/** Новый узел фигуры с дефолтными размером/данными. */
export const makeNode = (shape, position, overrides = {}) => ({
  id: newNodeId(shape),
  type: FLOW_TYPES[shape],
  position,
  ...sizeFor(shape),
  data: { ...defaultData(shape), ...overrides },
  // Зоны — самый низ, разделители над ними, остальное сверху (по порядку создания).
  zIndex: zIndexOf(shape),
  // Разделитель тянем сами (только по оси), поэтому flow его не перетаскивает.
  draggable: !isDivider(shape)
});

/** Приводит загруженный узел к безопасному виду (нет доверия к файлу). */
export function normalizeNode(raw) {
  const rawShape = raw?.data?.shape;
  // Старое имя «вертикальный уровень» → стадия.
  const legacyVertical = rawShape === 'level' && raw?.data?.orientation === 'vertical';
  const shape = legacyVertical ? 'stage' : SHAPES[rawShape] ? rawShape : 'rect';
  const data = { ...defaultData(shape), ...(raw?.data || {}), shape };
  delete data.orientation;
  return {
    id: String(raw?.id || newNodeId(shape)),
    type: FLOW_TYPES[shape],
    position: { x: Number(raw?.position?.x) || 0, y: Number(raw?.position?.y) || 0 },
    // Размеры из файла сохраняем, но в границах формата:
    // ресайз переживает сохранение, а разделитель не раздувается.
    ...clampSize(shape, Number(raw?.width) || sizeFor(shape).width, Number(raw?.height) || sizeFor(shape).height),
    data,
    zIndex: zIndexOf(shape),
    draggable: !isDivider(shape)
  };
}

/** Сериализация: nodes с пересчитанными взаимосвязями + рёбра + viewport. */
export function serialize({ name, nodes, edges, viewport }) {
  return {
    version: SCHEMA_VERSION,
    meta: { name: name || '', app: 'SEditor', updated: new Date().toISOString() },
    nodes: applyMembership(nodes).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      width: n.width,
      height: n.height,
      data: n.data
    })),
    edges: edges.map((e) => ({ ...e })),
    viewport: viewport || { x: 0, y: 0, zoom: 1 }
  };
}

/** Десериализация: чистим узлы/рёбра от мусора и лишних полей. */
export function deserialize(raw) {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes.map(normalizeNode) : [];
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(raw?.edges) ? raw.edges : []).filter(
    (e) => e && ids.has(e.source) && ids.has(e.target)
  );
  return {
    name: raw?.meta?.name || '',
    path: raw?.meta?.path || '',
    nodes,
    edges,
    viewport: raw?.viewport || { x: 0, y: 0, zoom: 1 }
  };
}
