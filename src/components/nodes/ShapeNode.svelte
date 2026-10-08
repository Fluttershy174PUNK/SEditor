<script>
  // Один компонент на все элементы: 7 фигур + надпись + таблица + зона + уровень.
  // Общая обвязка: 4 грани-метки для связей, подпись, ресайз, удаление, бейджи взаимосвязей.
  import { Handle, NodeResizer, Position } from '@xyflow/svelte';
  import { SHAPES, SIDES } from '../../lib/config.js';
  import { board } from '../../lib/board.svelte.js';
  import { t } from '../../lib/i18n.svelte.js';

  let { id, selected, data, width, height } = $props();

  const SIDE_POS = {
    top: Position.Top,
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left
  };

  const shape = $derived(data?.shape || 'rect');
  const spec = $derived(SHAPES[shape] || SHAPES.rect);
  const w = $derived(width ?? spec.w);
  const h = $derived(height ?? spec.h);
  const pos = $derived(data?.labelPos || 'inside');
  const isLayout = $derived(shape === 'zone');
  const tableRows = $derived(Math.max(1, data?.rows ?? 3) + (data?.header ? 1 : 0));
  const tableCols = $derived(Math.max(1, data?.cols ?? 3));
  const cellList = $derived(
    Array.from({ length: tableRows * tableCols }, (_, i) => {
      const r = Math.floor(i / tableCols);
      return { key: `${r},${i % tableCols}`, head: Boolean(data?.header) && r === 0, text: data?.cells?.[`${r},${i % tableCols}`] || '' };
    })
  );

  // Двойной клик по ячейке — заполнение данных таблицы (хранятся в data.cells).
  let editing = $state(null);
  const focus = (el) => el.focus();
  const startEdit = (cell) => (editing = cell.key);
  const commitEdit = (cell, value) => {
    if (editing !== cell.key) return; // Esc уже отменил правку
    editing = null;
    if (value === cell.text) return;
    const cells = { ...(data?.cells || {}) };
    const text = value.trim();
    if (text) cells[cell.key] = text;
    else delete cells[cell.key];
    board.editNode(id, { data: { cells } });
  };

  const zoneDash = $derived(data?.border === 'dotted' ? '2 4' : data?.border === 'dashed' || !data?.border ? '8 5' : undefined);
  const zoneMarch = $derived(shape === 'zone' && board.animate && data?.border === 'dashed');
  const zoneFlicker = $derived(shape === 'zone' && board.animate && data?.border === 'dotted');

  const keepRatio = $derived(Boolean(spec.sizeLocked));
  // Ресайз: undo-шаг пишется в начале жеста (как у перетаскивания),
  // а в конце только фиксируем итоговый размер без нового шага истории.
  // onResizeEnd(event, params) — первый аргумент это событие, размеры во втором!
  const startResize = () => board.mark();
  const commitResize = (_event, params) =>
    board.resizeNode(id, Math.round(params.width), Math.round(params.height), { silent: true });

  const zones = $derived(board.membership.zones[id] || []);
  // Ровно одно значение каждой оси: None — вне линий, иначе имя полосы или её номер.
  const bandLevel = $derived(board.membership.level[id] ?? null);
  const bandStage = $derived(board.membership.stage[id] ?? null);
  const zoneName = (zid) => board.labelOf(zid) || zid.slice(-4);
</script>

<div
  class="node"
  class:selected
  class:zone={shape === 'zone'}
  class:text={shape === 'label'}
  style:width={`${w}px`}
  style:height={`${h}px`}
  style:background={shape === 'zone' && data?.fill ? data.fill : undefined}
  role="group"
  aria-label={data?.label || shape}
>
  {#if isLayout}
    <svg class="zone-outline" class:march={zoneMarch} class:flicker={zoneFlicker} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <rect x="1" y="1" width={Math.max(0, w - 2)} height={Math.max(0, h - 2)} fill="none" stroke={data?.stroke || '#5c6b7a'} stroke-width="2" stroke-dasharray={zoneDash} />
    </svg>
  {:else}
    {#each SIDES as side (side)}
      <Handle id={side} type="source" position={SIDE_POS[side]} class="side {side}" />
    {/each}
  {/if}

  {#if selected}
    <NodeResizer
      isVisible
      minWidth={spec.minW}
      minHeight={spec.minH}
      maxWidth={spec.maxW}
      maxHeight={spec.maxH}
      keepAspectRatio={keepRatio}
      onResizeStart={startResize}
      onResizeEnd={commitResize}
    />
  {/if}

  {#if shape === 'table'}
    <div
      class="table"
      style:grid-template-columns={`repeat(${tableCols}, minmax(0, 1fr))`}
      style:grid-template-rows={`repeat(${tableRows}, minmax(0, 1fr))`}
    >
      {#each cellList as cell (cell.key)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="cell" class:head={cell.head} ondblclick={() => startEdit(cell)}>
          {#if editing === cell.key}
            <input
              use:focus
              value={cell.text}
              onblur={(e) => commitEdit(cell, e.currentTarget.value)}
              onkeydown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') (editing = null);
              }}
            />
          {:else}
            <span class="txt">{cell.text}</span>
          {/if}
        </div>
      {/each}
    </div>
  {:else if !isLayout && shape !== 'label'}
    <svg class="shape" viewBox="0 0 {w} {h}" width={w} height={h} preserveAspectRatio="none" aria-hidden="true">
      {#if shape === 'rect' || shape === 'square'}
        <rect x="1" y="1" width={Math.max(0, w - 2)} height={Math.max(0, h - 2)} />
      {:else if shape === 'circle' || shape === 'ellipse'}
        <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - 1)} ry={Math.max(0, h / 2 - 1)} />
      {:else if shape === 'diamond'}
        <polygon points="{w / 2},1 {w - 1},{h / 2} {w / 2},{h - 1} 1,{h / 2}" />
      {:else if shape === 'triangle'}
        <polygon points="{w / 2},1 {w - 1},{h - 1} 1,{h - 1}" />
      {:else if shape === 'hexagon'}
        <polygon
          points="{w * 0.25},1 {w * 0.75},1 {w - 1},{h / 2} {w * 0.75},{h - 1} {w * 0.25},{h - 1} 1,{h / 2}"
        />
      {/if}
    </svg>
  {/if}

  {#if data?.label}
    <span class="label {pos}" class:pixelhead={data?.header && shape === 'table'}>{data.label}</span>
  {/if}

  {#if selected && (zones.length || bandLevel || bandStage)}
    <div class="badges">
      {#if bandLevel}
        <span class="badge">{t('level')}: {bandLevel}</span>
      {/if}
      {#if bandStage}
        <span class="badge stage">{t('stage')}: {bandStage}</span>
      {/if}
      {#each zones as z (z)}
        <span class="badge zone">{t('zone')}: {zoneName(z)}</span>
      {/each}
    </div>
  {/if}

  <button class="del" title={t('delete')} aria-label={t('delete')} onclick={() => board.deleteNodes([id])}>×</button>
</div>

<style>
  .node {
    position: relative;
    user-select: none;
    color: var(--xy-node-color);
  }

  .shape {
    position: absolute;
    inset: 0;
    overflow: visible;
    /* Обводка — чистая графика: не перехватывает клики по портам и ресайзам. */
    pointer-events: none;
  }

  .shape rect,
  .shape polygon,
  .shape ellipse {
    fill: var(--panel-2);
    stroke: var(--line-strong);
    stroke-width: 2;
  }

  .node.selected .shape rect,
  .node.selected .shape polygon,
  .node.selected .shape ellipse {
    stroke: var(--accent);
  }

  .zone {
    background: color-mix(in srgb, #6fd3ff 7%, transparent);
  }

  .zone-outline {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }

  .zone-outline.march rect {
    animation: zone-march 5s linear infinite;
  }

  .zone-outline.flicker rect {
    animation: zone-flicker 4s ease-in-out infinite;
  }

  @keyframes zone-march {
    to { stroke-dashoffset: -26; }
  }

  @keyframes zone-flicker {
    50% { opacity: 0.25; }
  }

  .node.selected .zone-outline rect {
    stroke: var(--accent);
  }

  .table {
    position: absolute;
    inset: 0;
    display: grid;
    background: var(--panel-2);
    border: 2px solid var(--line-strong);
  }

  .node.selected .table {
    border-color: var(--accent);
  }

  .cell {
    position: relative;
    overflow: hidden;
    border-right: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    min-width: 0;
    min-height: 0;
    cursor: text;
  }

  .cell .txt {
    display: block;
    padding: 0 3px;
    font-size: 10px;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    font-size: 10px;
    padding: 0 2px;
  }

  .cell.head {
    background: var(--panel-3);
  }

  .label {
    position: absolute;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: none;
    line-height: 1.25;
    color: var(--ink);
    text-shadow: 1px 1px 0 #05080b;
  }

  .label.inside {
    inset: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .label.top {
    left: 0;
    right: 0;
    top: -1.35em;
  }
  .label.bottom {
    left: 0;
    right: 0;
    bottom: -1.35em;
  }
  .label.left {
    top: 0;
    bottom: 0;
    left: -0.5em;
    transform: translateX(-100%);
    display: flex;
    align-items: center;
  }
  .label.right {
    top: 0;
    bottom: 0;
    right: -0.5em;
    transform: translateX(100%);
    display: flex;
    align-items: center;
  }

  .label.pixelhead {
    inset: 0;
    align-items: flex-start;
    font-size: 11px;
  }

  .badges {
    position: absolute;
    top: -1.75em;
    left: 0;
    display: flex;
    gap: 3px;
    pointer-events: none;
  }

  .badge {
    background: var(--accent-2);
    color: var(--ink-strong);
    font-family: var(--font-pixel);
    font-size: 7px;
    line-height: 1.6;
    padding: 0 3px;
    text-transform: uppercase;
  }

  .badge.stage {
    background: var(--warn);
  }

  .badge.zone {
    background: var(--accent);
  }

  .del {
    position: absolute;
    top: -10px;
    right: -10px;
    width: 16px;
    height: 16px;
    padding: 0;
    font-size: 12px;
    line-height: 1;
    display: none;
    background: var(--err);
    color: #160303;
    border-color: #160303;
    box-shadow: 2px 2px 0 #05080b;
  }

  .node.selected .del {
    display: flex;
  }

  /* Порты для связей: пиксельные квадраты по центру граней.
     Видны при наведении/выделении и на всех узлах во время протяжки стрелки,
     цель клика больше метки за счёт невидимого padding в ::before. */
  :global(.svelte-flow__handle.side) {
    width: 12px;
    height: 12px;
    border: 2px solid var(--ink-strong);
    background: var(--accent-2);
    border-radius: 0;
    opacity: 0;
    cursor: crosshair;
    box-shadow: 2px 2px 0 var(--ink-strong);
    /* Порт лежит на границе и наполовину внутри узла — держим его выше графики
       (и выше линий ресайза, которые идут вдоль тех же граней),
       иначе попадания перехватываются и «стрелку» не протащить. */
    z-index: 7;
  }

  :global(.svelte-flow__handle.side::before) {
    content: '';
    position: absolute;
    inset: -6px;
  }

  .node:hover :global(.svelte-flow__handle.side),
  .node.selected :global(.svelte-flow__handle.side),
  :global(.svelte-flow__handle.side:hover),
  :global(.svelte-flow__handle.side:focus-visible),
  :global(.svelte-flow__handle.side.connectingfrom),
  :global(.svelte-flow__handle.side.connectionindicator) {
    opacity: 1;
  }

  :global(.svelte-flow__handle.side:hover) {
    background: var(--accent);
  }

  /* На тач-устройствах нет hover — порты видны всегда. */
  @media (hover: none) {
    :global(.svelte-flow__handle.side) {
      opacity: 0.85;
    }
  }
</style>
