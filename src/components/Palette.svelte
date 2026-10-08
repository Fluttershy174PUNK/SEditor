<script>
  // Палитра блоков: фигуры, особые элементы, разметка поля.
  // Клик — вставка в видимую часть холста, drag — вставка в точку сброса.
  import { PALETTE, SHAPE_MIME, sizeFor } from '../lib/config.js';
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
</style>
