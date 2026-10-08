// Единое состояние редактора. Модульный синглтон: Board и Inspector читают/пишут его напрямую.
import { clampSize, isDivider, OPPOSITE, SIDES, SHAPES, snapAxis } from './config.js';
import { computeMembership, nodeRect, nodesBounds } from './geometry.js';
import { clone, History } from './history.svelte.js';
import { deserialize, edgeId, makeNode, serialize } from './schema.js';
import * as api from './api.js';
import { t } from './i18n.svelte.js';

const persisted = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === '1';
  } catch {
    return fallback;
  }
};

// Анимация по умолчанию выключена при системном «уменьшенное движение».
const defaultAnimate = () => {
  try {
    return !matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
};

export class Board {
  name = $state('');
  path = $state('');
  dirty = $state(false);
  nodes = $state([]);
  edges = $state([]);
  viewport = $state({ x: 0, y: 0, zoom: 1 });
  selectedNodes = $state([]);
  selectedEdges = $state([]);
  showGrid = $state(true);
  snap = $state(true);
  // Анимация пунктира/точек на связях: галочка в верхнем баре, выбор запоминается.
  animate = $state(persisted('seditor.animate', defaultAnimate()));
  toast = $state(null);
  busy = $state(false);
  // Последние схемы с диска.
  recent = $state([]);
  // Границы панорамирования: считаются по содержимому (syncExtent).
  translateExtent = $state([
    [-1e6, -1e6],
    [1e6, 1e6]
  ]);

  history = new History();
  // Время последнего шага истории — для склейки быстрых правок одного поля.
  lastMark = 0;

  get selectedNode() {
    return this.nodes.find((n) => n.id === this.selectedNodes[0]) || null;
  }

  get selectedEdge() {
    return this.edges.find((e) => e.id === this.selectedEdges[0]) || null;
  }

  /** Подпись элемента по id (для списков связей и размещения). */
  labelOf(id) {
    return this.nodes.find((n) => n.id === id)?.data?.label || '';
  }

  /**
   * Выделение целиком: пишет и id, и флаги selected в сами узлы/рёбра.
   * Флаги — источник правды для рендера Svelte Flow (рамка, ручки ресайза и связей),
   * поэтому выделение «из кода» (палитра, дублирование, Esc) обязано идти через это.
   */
  selectNodes(nodeIds, edgeIds = []) {
    const nodes = new Set(nodeIds);
    const edges = new Set(edgeIds);
    this.nodes = this.nodes.map((n) => {
      const selected = nodes.has(n.id);
      return n.selected === selected ? n : { ...n, selected };
    });
    this.edges = this.edges.map((e) => {
      const selected = edges.has(e.id);
      return e.selected === selected ? e : { ...e, selected };
    });
    this.selectedNodes = [...nodeIds];
    this.selectedEdges = [...edgeIds];
  }

  // $derived вместо getter: пересчёт один раз на изменение nodes, а не на каждый
  // компонент (раньше каждый узел на холсте гонял computeMembership по всем узлам).
  /** Взаимосвязи (зоны/уровни/стадии), пересчитываются от текущей геометрии. */
  membership = $derived(computeMembership(this.nodes));

  /** Границы содержимого: по ним линии-разделители тянутся через всё поле. */
  dividerBounds = $derived(nodesBounds(this.nodes));

  snapshot() {
    return { nodes: clone(this.nodes), edges: clone(this.edges) };
  }

  /**
   * Запомнить состояние перед изменением (для undo).
   * coalesce=true — не плодить шаги при быстром наборе в одном поле.
   */
  mark(coalesce = false) {
    const now = Date.now();
    if (coalesce && now - this.lastMark < 600) {
      this.lastMark = now;
      this.dirty = true;
      return;
    }
    this.lastMark = now;
    this.history.push(this.snapshot());
    this.dirty = true;
  }

  restore(snap) {
    if (!snap) return;
    this.nodes = clone(snap.nodes);
    this.edges = clone(snap.edges);
    this.syncExtent();
    this.dirty = true;
  }

  undo() {
    const previous = this.history.undo(this.snapshot());
    if (previous) this.restore(previous);
  }

  redo() {
    const next = this.history.redo(this.snapshot());
    if (next) this.restore(next);
  }

  notify(message, kind = 'ok') {
    this.toast = { message, kind, id: Date.now() };
  }

  setAnimate(value) {
    this.animate = value;
    try {
      localStorage.setItem('seditor.animate', value ? '1' : '0');
    } catch {}
  }

  /**
   * Проекция точки курсора на ось разделителя и запись позиции.
   * Свободная координата всегда остаётся исходной — линия движется только по своей оси.
   */
  applyDividerDrag(state, point, snap = true) {
    const node = this.nodes.find((n) => n.id === state.id);
    if (!node) return;
    const axis = snapAxis(state.horizontal ? point.y : point.x, snap);
    const position = state.horizontal ? { x: state.origin.x, y: axis } : { x: axis, y: state.origin.y };
    if (node.position.x === position.x && node.position.y === position.y) return;
    this.updateNode(state.id, { position });
    this.dirty = true;
  }

  /**
   * Растягивание ручки разделителя за конец ленты: меняется только длина,
   * ось линии стоит на месте. Конец left/top двигает и позицию — чтобы
   * противоположный конец остался там, где был.
   */
  applyDividerStretch(state, point, snap = true) {
    const node = this.nodes.find((n) => n.id === state.id);
    if (!node) return;
    const cursor = snapAxis(state.horizontal ? point.x : point.y, snap);
    const grow = (cursor - state.start) * (state.fromEnd ? 1 : -1);
    const size = clampSize(
      node.data.shape,
      state.horizontal ? state.origin.width + grow : state.origin.width,
      state.horizontal ? state.origin.height : state.origin.height + grow
    );
    const position = { x: state.origin.x, y: state.origin.y };
    if (!state.fromEnd) {
      if (state.horizontal) position.x = state.origin.x + state.origin.width - size.width;
      else position.y = state.origin.y + state.origin.height - size.height;
    }
    if (size.width === node.width && size.height === node.height && position.x === node.position.x && position.y === node.position.y) return;
    this.updateNode(state.id, { ...size, position });
    this.dirty = true;
  }

  // --- узлы ---------------------------------------------------------------

  addNode(shape, position) {
    if (!SHAPES[shape]) return null;
    this.mark();
    const node = makeNode(shape, position);
    this.nodes = [...this.nodes, node];
    this.selectNodes([node.id]);
    this.syncExtent();
    return node;
  }

  updateNode(id, patch) {
    this.nodes = this.nodes.map((n) =>
      n.id === id ? { ...n, ...patch, data: patch.data ? { ...n.data, ...patch.data } : n.data } : n
    );
  }

  /** Изменение с записью в историю (для правок из панели свойств). */
  editNode(id, patch, options = {}) {
    if (!options.silent) this.mark(options.coalesce);
    this.updateNode(id, patch);
    this.dirty = true;
  }

  resizeNode(id, width, height, options = {}) {
    const node = this.nodes.find((n) => n.id === id);
    // Защита от NaN/Infinity: мусорный размер ломает и узел, и дальнейший ресайз.
    if (!node || !Number.isFinite(width) || !Number.isFinite(height)) return;
    const size = clampSize(node.data.shape, width, height);
    if (!options.silent) this.mark();
    this.updateNode(id, size);
    this.syncExtent();
    this.dirty = true;
  }

  /** Копия узла со смещением — правый клик → «Дублировать». */
  duplicateNode(id) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    this.mark();
    const copy = this.copyOf(node, new Set(this.nodes.map((n) => n.id)));
    this.nodes = [...this.nodes, copy];
    this.selectNodes([copy.id]);
    this.syncExtent();
  }

  /** Копия узла со смещением и новым уникальным id. occupied — уже занятые id. */
  copyOf(node, occupied) {
    let id = `${node.id}-c`;
    let n = 1;
    while (occupied.has(id)) id = `${node.id}-c${n++}`;

    const offset = isDivider(node.data?.shape)
      ? SHAPES[node.data.shape].divider === 'horizontal'
        ? { x: 0, y: 50 }
        : { x: 50, y: 0 }
      : { x: 24, y: 24 };

    return {
      ...clone(node),
      id,
      position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
      selected: false
    };
  }

  /** Дублировать пачку: один шаг undo на все копии. */
  duplicateNodes(ids) {
    const sources = ids.map((id) => this.nodes.find((n) => n.id === id)).filter(Boolean);
    if (!sources.length) return;
    this.mark();
    const occupied = new Set(this.nodes.map((n) => n.id));
    const copies = sources.map((source) => {
      const copy = this.copyOf(source, occupied);
      occupied.add(copy.id);
      return copy;
    });
    this.nodes = [...this.nodes, ...copies];
    this.selectNodes(copies.map((c) => c.id));
    this.syncExtent();
  }

  /** Удаление узлов (+сопутствующих связей) и отдельно выделенных связей — одним шагом undo. */
  deleteNodes(ids, edgeIds = []) {
    if (!ids.length && !edgeIds.length) return;
    this.mark();
    const remove = new Set(ids);
    const dropEdges = new Set(edgeIds);
    this.nodes = this.nodes.filter((n) => !remove.has(n.id));
    this.edges = this.edges.filter(
      (e) => !remove.has(e.source) && !remove.has(e.target) && !dropEdges.has(e.id)
    );
    this.selectedNodes = this.selectedNodes.filter((id) => !remove.has(id));
    this.selectedEdges = this.selectedEdges.filter((id) => !dropEdges.has(id));
    this.syncExtent();
  }

  // --- таблица ------------------------------------------------------------

  editTable(id, patch) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    const cols = Math.max(1, Math.min(50, Math.round(patch.cols ?? node.data.cols ?? 3)));
    const rows = Math.max(1, Math.min(200, Math.round(patch.rows ?? node.data.rows ?? 3)));
    this.editNode(id, { data: { ...patch, cols, rows } });
  }

  // --- рёбра --------------------------------------------------------------

  addEdge(connection, options = {}) {
    const { source, target, sourceHandle, targetHandle } = connection;
    if (!source || !target || source === target) return null;

    // Svelte Flow сам создаёт «пустое» ребро до вызова onconnect:
    // если такое уже есть — дооформляем его, иначе будет дубль.
    const existing = this.edges.find(
      (e) => e.source === source && e.target === target && e.sourceHandle === sourceHandle && e.targetHandle === targetHandle
    );
    if (existing?.data) return existing;

    const edge = {
      id: existing?.id ?? edgeId(),
      source,
      target,
      sourceHandle: sourceHandle ?? 'right',
      targetHandle: targetHandle ?? 'left',
      type: 'straight',
      data: { label: '', dash: 'solid', marker: 'arrow', arrow: 'end', width: 2, stroke: '#e6eef5' },
      ...options
    };

    this.mark();
    this.edges = existing ? this.edges.map((e) => (e.id === existing.id ? { ...edge, selected: e.selected } : e)) : [...this.edges, edge];
    this.selectNodes([], [edge.id]);
    return edge;
  }

  editEdge(id, patch, options = {}) {
    this.mark(options.coalesce);
    this.edges = this.edges.map((e) =>
      e.id === id ? { ...e, ...patch, data: patch.data ? { ...e.data, ...patch.data } : e.data } : e
    );
    this.dirty = true;
  }

  /** Развернуть связь: поменять местами source/target и грани. */
  reverseEdge(id) {
    this.mark();
    this.edges = this.edges.map((e) =>
      e.id === id
        ? { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle }
        : e
    );
    this.dirty = true;
  }

  /** Сменить грань у конца связи (когда элемент повернули/перетащили). */
  setEdgeSide(id, which, side) {
    if (!SIDES.includes(side)) return;
    this.mark();
    this.edges = this.edges.map((e) =>
      e.id === id ? { ...e, [which === 'source' ? 'sourceHandle' : 'targetHandle']: side } : e
    );
  }

  flipEdgeSide(id, which) {
    const edge = this.edges.find((e) => e.id === id);
    if (!edge) return;
    const key = which === 'source' ? 'sourceHandle' : 'targetHandle';
    this.setEdgeSide(id, which, OPPOSITE[edge[key]] ?? 'left');
  }

  deleteEdge(id) {
    this.mark();
    this.edges = this.edges.filter((e) => e.id !== id);
    this.selectedEdges = this.selectedEdges.filter((x) => x !== id);
  }

  // --- схема --------------------------------------------------------------

  newSchema() {
    const fresh = deserialize(null);
    this.name = '';
    this.path = '';
    this.nodes = fresh.nodes;
    this.edges = fresh.edges;
    this.viewport = fresh.viewport;
    this.selectedNodes = [];
    this.selectedEdges = [];
    this.history.reset();
    this.lastMark = 0;
    this.dirty = false;
    this.syncExtent();
  }

  loadSchema(raw) {
    const loaded = deserialize(raw);
    this.name = loaded.name;
    this.path = loaded.path;
    this.nodes = loaded.nodes;
    this.edges = loaded.edges;
    this.viewport = loaded.viewport;
    this.selectedNodes = [];
    this.selectedEdges = [];
    this.history.reset();
    this.lastMark = 0;
    this.dirty = false;
    this.syncExtent();
  }

  payload() {
    return serialize({ name: this.name, nodes: this.nodes, edges: this.edges, viewport: this.viewport });
  }

  async refreshRecent() {
    try {
      const { items } = await api.listSchemas();
      this.recent = items;
    } catch {
      this.recent = [];
    }
  }

  async openPath(path) {
    this.busy = true;
    try {
      const { data } = await api.readSchema(path);
      this.loadSchema(data);
      this.notify(`${t('loaded')}: ${path}`);
    } catch (err) {
      this.notify(`${t('error')}: ${err.message}`, 'error');
    } finally {
      this.busy = false;
    }
  }

  /** Сохранение текущей схемы. Без имени — уводит в диалог «Сохранить как». */
  async save() {
    const name = (this.name || '').trim();
    if (!name) return false;
    return this.saveAs(this.path || `schemas/${name}.json`, true);
  }

  async saveAs(path, silent = false) {
    const rel = (path || '').trim();
    if (!rel) return false;
    this.busy = true;
    try {
      const payload = this.payload();
      payload.meta.name = this.name || rel.replace(/\.json$/i, '').split('/').pop();
      const result = await api.writeSchema(rel, payload);
      this.path = result.path;
      if (!this.name) this.name = payload.meta.name;
      this.dirty = false;
      if (!silent) this.notify(`${t('saved')}: ${result.path}`);
      this.refreshRecent();
      return true;
    } catch (err) {
      this.notify(`${t('error')}: ${err.message}`, 'error');
      return false;
    } finally {
      this.busy = false;
    }
  }

  renameTo(name) {
    this.name = name;
    this.dirty = true;
  }

  /** Поле расширяется под крайние элементы; зоны и разделители на него не влияют.
   *  При схеме из одних уровней/стадий поле остаётся бесконечным: границы по ручкам
   *  разделителей зажимали бы панораму до крохотного окна, и клики по улетающему
   *  холсту переставали работать. */
  syncExtent() {
    const content = this.nodes.filter((n) => !isDivider(n.data?.shape) && n.data?.shape !== 'zone');
    if (!content.length) {
      this.translateExtent = [
        [-1e6, -1e6],
        [1e6, 1e6]
      ];
      return;
    }
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
    const pad = 600;
    this.translateExtent = [
      [minX - pad, minY - pad],
      [maxX + pad, maxY + pad]
    ];
  }
}

export const board = new Board();

// Отладочный хук: состояние из консоли (window.seditor.board).
if (typeof window !== 'undefined') window.seditor = { ...(window.seditor || {}), board };
