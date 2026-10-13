<script>
  // Палитра блоков: фигуры, особые элементы, разметка поля.
  // Клик — вставка в видимую часть холста, drag — вставка в точку сброса.
  import { FILL_COLORS, PALETTE, SHAPE_MIME, sizeFor } from '../lib/config.js';
  import { board } from '../lib/board.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import PixelIcon from './PixelIcon.svelte';
  import { useSvelteFlow } from '@xyflow/svelte';

  const flow = useSvelteFlow();

  const groups = $derived([
    { key: 'groupShapes', items: PALETTE.shapes },
    { key: 'groupSpecial', items: PALETTE.special },
    { key: 'groupLayout', items: PALETTE.layout }
  ]);
  const layerPositions = $derived(
    board.nodes.filter((node) => PALETTE.shapes.includes(node.data?.shape))
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      .map((node) => node.id)
  );
  const selectedPositions = $derived(board.selectedNodes.map((id) => layerPositions.indexOf(id)).filter((i) => i >= 0));
  const canMoveBackward = $derived(selectedPositions.length > 0 && Math.min(...selectedPositions) > 0);
  const canMoveForward = $derived(selectedPositions.length > 0 && Math.max(...selectedPositions) < layerPositions.length - 1);

  // Куда встанет новая фигура: центр видимой области холста, каскадом.
  const nextPosition = (shape) => {
    const rect = document.querySelector('.svelte-flow')?.getBoundingClientRect();
    const center = rect
      ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 0, y: 0 };
    const size = sizeFor(shape);
    const step = (board.nodes.length % 8) * 24;
    return { x: Math.round(center.x - size.width / 2 + step), y: Math.round(center.y - size.height / 2 + step) };
  };

  const place = (shape) => {
    const node = board.addNode(shape, nextPosition(shape));
    if (node) board.notify(`${t('added')}: ${t(shape)}`);
    return node;
  };

  const onDragStart = (event, shape) => {
    event.dataTransfer.setData(SHAPE_MIME, shape);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const fillSelection = (fill) => {
    const selected = board.nodes.filter((node) => board.selectedNodes.includes(node.id) && PALETTE.shapes.includes(node.data?.shape));
    if (!selected.length) return;
    board.mark();
    for (const node of selected) board.updateNode(node.id, { data: { fill } });
    board.dirty = true;
  };
</script>

<section class="palette" aria-label={t('palette')}>
  {#each groups as group (group.key)}
    <h3>{t(group.key)}</h3>
    <div class="grid">
      {#each group.items as shape (shape)}
        <button
          class="item"
          draggable="true"
          title="{t(shape)} — {t('clickOrDrag')}"
          aria-label={t(shape)}
          data-shape={shape}
          ondragstart={(e) => onDragStart(e, shape)}
          onclick={() => place(shape)}
        >
          <PixelIcon name={shape} size={20} />
          <span class="name">{t(shape)}</span>
        </button>
      {/each}
    </div>
  {/each}
  <h3>{t('fill')}</h3>
  <div class="colors" aria-label={t('fill')}>
    {#each FILL_COLORS as color (color)}
      <button class="swatch" style:--swatch={color} title={color} aria-label={color} onclick={() => fillSelection(color)}></button>
    {/each}
  </div>
  <div class="layers">
    <button disabled={!canMoveBackward} title={t('sendBack')} aria-label={t('sendBack')} onclick={() => board.moveSelectedShapes(-1)}>↓ {t('sendBack')}</button>
    <button disabled={!canMoveForward} title={t('bringFront')} aria-label={t('bringFront')} onclick={() => board.moveSelectedShapes(1)}>↑ {t('bringFront')}</button>
  </div>
</section>

<style>
  .palette {
    padding: 8px 8px 10px;
    border-bottom: 2px solid var(--line);
    background: var(--panel);
    flex: 0 0 auto;
  }

  h3 {
    margin: 8px 0 5px;
    font-size: 10px;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h3:first-child {
    margin-top: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
  }

  .item {
    flex-direction: column;
    gap: 3px;
    padding: 6px 2px 4px;
    height: auto;
    min-width: 0;
    color: var(--ink);
  }

  .item:hover {
    color: var(--accent);
  }

  .name {
    /* Названия фигур — моноширинный: пиксельный шрифт шире и не влезает. */
    font-family: var(--font-mono);
    font-size: 9px;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    color: var(--ink-dim);
  }

  .item:hover .name {
    color: var(--accent);
  }

  .item:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 #05080b;
  }

  .colors {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  button.swatch {
    width: 20px;
    height: 20px;
    min-width: 0;
    padding: 0;
    background: color-mix(in srgb, var(--swatch) 60%, var(--panel-2));
    box-shadow: 1px 1px 0 var(--ink-strong);
  }

  button.swatch:hover {
    background: var(--swatch);
  }

  .layers {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .layers button {
    flex: 1;
    min-width: 0;
    padding: 4px 2px;
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .layers button:disabled {
    opacity: 0.4;
  }
</style>
