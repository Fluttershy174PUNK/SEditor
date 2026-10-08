<script>
  // Холст: SvelteFlow + сетка + контекстное меню + зум-контролы.
  import { Background, BackgroundVariant, SvelteFlow, useSvelteFlow } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/base.css';
  import ShapeNode from './nodes/ShapeNode.svelte';
  import DividerNode from './nodes/DividerNode.svelte';
  import EdgePath from './EdgePath.svelte';
  import PixelIcon from './PixelIcon.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import { board } from '../lib/board.svelte.js';
  import { SHAPE_MIME, SHAPES, isDivider } from '../lib/config.js';
  import { t } from '../lib/i18n.svelte.js';

  const flow = useSvelteFlow();

  const nodeTypes = {
    shape: ShapeNode,
    text: ShapeNode,
    table: ShapeNode,
    zone: ShapeNode,
    divider: DividerNode
  };

  // Свои рёбра: надпись, стиль линии, метка и направление.
  const edgeTypes = { straight: EdgePath, step: EdgePath, smoothstep: EdgePath, default: EdgePath };

  // Контекстное меню: { x, y, target: {kind, id} }
  let menu = $state(null);

  const openNodeMenu = ({ node, event }) => {
    event.preventDefault();
    board.selectNodes([node.id]);
    menu = { x: event.clientX, y: event.clientY, kind: 'node', id: node.id };
  };

  const openEdgeMenu = ({ edge, event }) => {
    event.preventDefault();
    board.selectNodes([], [edge.id]);
    menu = { x: event.clientX, y: event.clientY, kind: 'edge', id: edge.id };
  };

  /** Правый клик по пустому полю — быстро добавить фигуру в этой точке. */
  const openPaneMenu = ({ event }) => {
    event.preventDefault();
    menu = { x: event.clientX, y: event.clientY, kind: 'pane', flowPos: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }) };
  };

  const closeMenu = () => {
    menu = null;
  };

  // Перетаскивание из палитры: reorder-данные в dataTransfer.
  const onDrop = (event) => {
    const shape = event.dataTransfer?.getData(SHAPE_MIME);
    if (!shape) return;
    event.preventDefault();
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    board.addNode(shape, position);
  };
  const onDragOver = (event) => {
    if (event.dataTransfer?.types?.includes(SHAPE_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const onSelectionChange = ({ nodes, edges }) => {
    board.selectedNodes = nodes.map((n) => n.id);
    board.selectedEdges = edges.map((e) => e.id);
  };

  // Удаление с клавиатуры обрабатываем сами (Editor.svelte): rx-flow deleteKey выключен.
  const onConnect = (connection) => board.addEdge(connection);

  /**
   * Разделитель ведём сами: Svelte Flow не умеет ограничивать узел одной осью,
   * а у divider draggable=false. Ловим pointerdown в capture-фазе на window —
   * так жест не зависит от делегирования событий Svelte/flow.
   */
  const onWindowPointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target?.closest?.('.del')) return;
    // Якоря растягивания ручки — свой собственный жест, не перетаскивание оси.
    if (event.target?.closest?.('.svelte-flow__resize-control')) return;

    const nodeEl = event.target?.closest?.('.svelte-flow__node-divider');
    const node = nodeEl && board.nodes.find((n) => n.id === nodeEl.dataset.id);
    if (!node || !isDivider(node.data?.shape)) return;

    const horizontal = SHAPES[node.data.shape].divider === 'horizontal';
    // Два жеста: тянем за конец ленты — растягиваем её, иначе двигаем по оси.
    const stretch = event.target?.closest?.('.stretch');
    const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const state = stretch
      ? {
          id: node.id,
          horizontal,
          fromEnd: stretch.classList.contains('end'),
          start: horizontal ? point.x : point.y,
          origin: { x: node.position.x, y: node.position.y, width: node.width, height: node.height }
        }
      : { id: node.id, horizontal, origin: { x: node.position.x, y: node.position.y } };
    // Разделитель управляется этим жестом, не даём Svelte Flow запустить
    // параллельно рамку выделения/перетаскивание узла.
    event.stopPropagation();
    board.mark();
    board.selectNodes([node.id]);

    const onMove = (moveEvent) => {
      const p = flow.screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      if (stretch) board.applyDividerStretch(state, p, board.snap);
      else board.applyDividerDrag(state, p, board.snap);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      board.dirty = true;
      board.syncExtent();
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
  };

  const onNodeDragStart = (payload) => {
    const node = payload?.targetNode || payload?.node || payload?.nodes?.[0];
    if (node && isDivider(node.data?.shape)) return;
    board.mark();
  };

  const onNodeDragStop = () => {
    board.dirty = true;
    board.syncExtent();
  };

  const onMoveEnd = (_, viewport) => {
    board.viewport = viewport;
  };
</script>

<svelte:window onpointerdowncapture={onWindowPointerDown} />

<div
  class="canvas"
  role="application"
  aria-label={t('canvas')}
  ondragover={onDragOver}
  ondrop={onDrop}
>
  <SvelteFlow
    bind:nodes={board.nodes}
    bind:edges={board.edges}
    bind:viewport={board.viewport}
    {nodeTypes}
    {edgeTypes}
    connectionMode="loose"
    connectionRadius={32}
    nodesDraggable
    nodeDragThreshold={2}
    snapGrid={board.snap ? [8, 8] : [1, 1]}
    minZoom={0.2}
    maxZoom={2.5}
    deleteKey={null}
    translateExtent={board.translateExtent}
    /* Левая кнопка — рамка выделения (как в редакторах схем),
       панорама — средней и правой кнопкой, Shift — добавить к выделению. */
    selectionOnDrag
    panOnDrag={[1, 2]}
    selectionKey={['Shift']}
    multiSelectionKey={['Shift', 'Meta', 'Control']}
    elevateNodesOnSelect={false}
    defaultEdgeOptions={{ type: 'straight' }}
    proOptions={{ hideAttribution: true }}
    ariaLabelConfig={{ nodeAriaLabel: t('shape') }}
    onnodecontextmenu={openNodeMenu}
    onedgecontextmenu={openEdgeMenu}
    onpanecontextmenu={openPaneMenu}
    onpaneclick={closeMenu}
    onselectionchange={onSelectionChange}
    onnodedragstart={onNodeDragStart}
    onnodedragstop={onNodeDragStop}
    onmoveend={onMoveEnd}
    onconnect={onConnect}
  >
    <Background
      variant={BackgroundVariant.Lines}
      gap={24}
      lineWidth={1}
      patternColor={board.showGrid ? 'rgba(122, 162, 247, 0.18)' : 'transparent'}
      bgColor="transparent"
    />
  </SvelteFlow>

  {#if !board.nodes.length}
    <p class="hint">{t('emptyCanvasHint')}</p>
  {/if}

  <div class="zoom">
    <button title={t('zoomIn')} aria-label={t('zoomIn')} onclick={() => flow.zoomIn()}><PixelIcon name="plus" /></button>
    <button title={t('zoomOut')} aria-label={t('zoomOut')} onclick={() => flow.zoomOut()}><PixelIcon name="minus" /></button>
    <button title={t('fit')} aria-label={t('fit')} onclick={() => flow.fitView({ padding: 0.2 })}><PixelIcon name="fit" /></button>
  </div>

  {#if menu}
    <ContextMenu
      x={menu.x}
      y={menu.y}
      kind={menu.kind}
      id={menu.id}
      flowPos={menu.flowPos}
      onclose={closeMenu}
    />
  {/if}
</div>

<style>
  .canvas {
    position: relative;
    grid-area: main;
    min-width: 0;
    min-height: 0;
    background:
      radial-gradient(circle at 50% 0%, #16212c 0%, var(--bg) 70%);
  }

  .hint {
    position: absolute;
    inset: auto 0 60px 0;
    text-align: center;
    color: var(--ink-dim);
    pointer-events: none;
    margin: 0;
  }

  .zoom {
    position: absolute;
    left: 8px;
    bottom: 8px;
    display: flex;
    gap: 4px;
    z-index: 5;
  }

  .zoom button {
    width: 26px;
    height: 26px;
    padding: 0;
  }
</style>
