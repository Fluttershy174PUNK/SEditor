// Формат файла схемы (SEditor schema v1).
// При сохранении взаимосвязи (зоны/уровни) пересчитываются и пишутся в data узлов.
import { clampSize, defaultData, FILL_COLORS, FLOW_TYPES, isDivider, PALETTE, SHAPES, sizeFor, zIndexOf } from './config.js';
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
  if (PALETTE.shapes.includes(shape) && !FILL_COLORS.includes(data.fill)) delete data.fill;
  delete data.orientation;
  return {
    id: String(raw?.id || newNodeId(shape)),
    type: FLOW_TYPES[shape],
    position: { x: Number(raw?.position?.x) || 0, y: Number(raw?.position?.y) || 0 },
    // Размеры из файла сохраняем, но в границах формата:
    // ресайз переживает сохранение, а разделитель не раздувается.
    ...clampSize(shape, Number(raw?.width) || sizeFor(shape).width, Number(raw?.height) || sizeFor(shape).height),
    data: { ...data, ...(PALETTE.shapes.includes(shape) && Number.isFinite(raw?.zIndex) ? { zIndex: raw.zIndex } : {}) },
    zIndex: zIndexOf(shape) ?? (Number.isFinite(raw?.zIndex) ? raw.zIndex : undefined),
    draggable: !isDivider(shape)
  };
}

const cleanEdgeData = (source = {}) => {
  const data = { ...source };
  for (const [key, value] of Object.entries({ label: '', dash: 'solid', marker: 'none', arrow: 'end', width: 2, stroke: '#cfe3f5' })) {
    if (data[key] === value) delete data[key];
  }
  return data;
};

const cleanData = (source = {}) => {
  const data = { ...source };
  for (const key of ['zones', 'contains', 'level', 'stage', 'zIndex']) delete data[key];
  for (const [key, value] of Object.entries({ label: '', desc: '', labelPos: 'inside' })) {
    if (data[key] === value) delete data[key];
  }
  if (data.shape === 'table') {
    if (data.fill) delete data.fill;
    for (const [key, value] of Object.entries({ cols: 3, rows: 3, header: true })) {
      if (data[key] === value) delete data[key];
    }
    if (data.cells && !Object.keys(data.cells).length) delete data.cells;
  }
  if (data.shape === 'zone') {
    if (data.border === 'dashed') delete data.border;
    if (data.fill === '') delete data.fill;
    if (data.stroke === '#5c6b7a') delete data.stroke;
  }
  if (data.shape === 'zone' || isDivider(data.shape) || !PALETTE.shapes.includes(data.shape)) delete data.zIndex;
  if (PALETTE.shapes.includes(data.shape) && data.zIndex === 0) delete data.zIndex;
  if (isDivider(data.shape)) {
    if (data.stroke === '#7c8b9a') delete data.stroke;
    if (data.dash === 'dashed') delete data.dash;
    if (data.thickness === 2) delete data.thickness;
  }
  return data;
};

/** Сериализация: defaults and geometric outputs are omitted for readable, compact JSON. */
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
      data: cleanData(n.data),
      ...(PALETTE.shapes.includes(n.data?.shape) && Number.isFinite(n.zIndex) && n.zIndex !== 0 ? { zIndex: n.zIndex } : {})
    })),
    edges: edges.map((edge) => {
      const { id, source, target, sourceHandle, targetHandle, type, data } = edge;
      const normalizedData = cleanEdgeData(data);
      return {
        id, source, target, sourceHandle, targetHandle,
        ...(type && type !== 'straight' ? { type } : {}),
        ...(Object.keys(normalizedData).length ? { data: normalizedData } : {})
      };
    }),
    viewport: viewport || { x: 0, y: 0, zoom: 1 }
  };
}

/** Десериализация: чистим узлы/рёбра от мусора и лишних полей. */
export function deserialize(raw) {
  const version = raw?.version == null ? 1 : Number(raw.version);
  if (!Number.isInteger(version) || version < 1 || version > SCHEMA_VERSION) throw new Error(`Unsupported schema version: ${raw.version}`);
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
