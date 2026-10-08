<script>
  // Разделитель: уровень — горизонтальная линия, стадия — вертикальная.
  // Узел — ручка: тянется по своей оси, растягивается якорями на концах (по длине).
  // Линия идёт через всё поле. Подпись именует пространство: у уровня — сверху/снизу,
  // у стадии — справа/слева; стоит по центру линии.
  // Растягивание за концы ленты — свой осевой жест (та же механика, что у
  // перетаскивания линии): библиотечный NodeResizer здесь не живёт, а ось
  // и так зажата clampSize. Жест ловится в FlowCanvas → board.applyDividerStretch.
  import { board } from '../../lib/board.svelte.js';
  import { SHAPES } from '../../lib/config.js';
  import { t } from '../../lib/i18n.svelte.js';

  let { id, selected, data, positionAbsoluteX, positionAbsoluteY, width, height } = $props();

  // Кастомному узлу Svelte Flow не передаёт position — только абсолютные координаты.
  // У разделителя нет родителя, поэтому они равны position.
  const position = $derived({ x: positionAbsoluteX ?? 0, y: positionAbsoluteY ?? 0 });

  const shape = $derived(data?.shape === 'stage' ? 'stage' : 'level');
  const horizontal = $derived(SHAPES[shape].divider === 'horizontal');
  const spec = $derived(SHAPES[shape]);
  const stroke = $derived(data?.stroke || '#7c8b9a');
  const dashArray = $derived(data?.dash === 'dotted' ? '2 4' : data?.dash === 'dashed' ? '8 5' : undefined);
  const march = $derived(board.animate && data?.dash === 'dashed');
  const flicker = $derived(board.animate && data?.dash === 'dotted');
  const thickness = $derived(Math.max(1, data?.thickness ?? 2));

  // Линия — бесконечная: тянется через всё поле и выходит далеко за его край,
  // чтобы не обрываться на углу содержимого.
  const bounds = $derived(board.dividerBounds);
  const OUT = 20000;

  // Размер ручки: явный width/height важнее дефолта формата.
  const w = $derived(width ?? spec.w);
  const h = $derived(height ?? spec.h);

  const lineStyleAttr = $derived(
    horizontal
      ? `left:${bounds.x - OUT - position.x}px; width:${OUT + Math.max(1, bounds.x2 - bounds.x) + OUT}px; top:${h / 2 - thickness / 2}px; height:${thickness}px;`
      : `top:${bounds.y - OUT - position.y}px; height:${OUT + Math.max(1, bounds.y2 - bounds.y) + OUT}px; left:${w / 2 - thickness / 2}px; width:${thickness}px;`
  );

  // Подпись — по центру линии, на своей стороне: уровень именует полосу
  // сверху (дефолт), стадия — слева (дефолт); сторону можно переключить.
  const labelSide = $derived(
    horizontal ? (data?.labelPos === 'bottom' ? 'bottom' : 'top') : data?.labelPos === 'right' ? 'right' : 'left'
  );
  const mid = $derived(
    horizontal
      ? (bounds.x + bounds.x2) / 2 - position.x
      : (bounds.y + bounds.y2) / 2 - position.y
  );
  const labelStyle = $derived(
    horizontal
      ? `left:${mid}px; top:${labelSide === 'top' ? h / 2 - 24 : h / 2 + 10}px; transform:translateX(-50%);`
      : `top:${mid}px; left:${labelSide === 'left' ? w / 2 - 8 : w / 2 + 8}px; transform:${labelSide === 'left' ? 'translate(-100%, -50%)' : 'translateY(-50%)'};`
  );

  const axis = $derived(horizontal ? Math.round(position.y + h / 2) : Math.round(position.x + w / 2));
</script>

<div
  class="divider {shape}"
  class:selected
  class:horizontal
  class:vertical={!horizontal}
  style:width={`${w}px`}
  style:height={`${h}px`}
  aria-label={data?.label ? `${t(shape)}: ${data.label}` : t(shape)}
  title="{t(shape)} · {horizontal ? 'y' : 'x'} = {axis}"
>
  <svg class="line" class:march class:flicker style={lineStyleAttr} aria-hidden="true">
    {#if horizontal}
      <line x1="0" y1={thickness / 2} x2="100%" y2={thickness / 2} stroke={stroke} stroke-width={thickness} stroke-dasharray={dashArray} />
    {:else}
      <line x1={thickness / 2} y1="0" x2={thickness / 2} y2="100%" stroke={stroke} stroke-width={thickness} stroke-dasharray={dashArray} />
    {/if}
  </svg>

  {#if data?.label}
    <span class="caption" style={labelStyle}>{data.label}</span>
  {/if}

  <span class="grip" aria-hidden="true"></span>

  <!-- Концы ленты: за них тянем длину (жёлтые — как якоря ресайза). -->
  {#if selected}
    <span class="stretch start"></span>
    <span class="stretch end"></span>
  {/if}

  <button
    class="del"
    title={t('delete')}
    aria-label={t('delete')}
    onpointerdown={(e) => e.stopPropagation()}
    onclick={() => board.deleteNodes([id])}>×</button>
</div>

<style>
  .divider {
    position: relative;
    user-select: none;
    cursor: move;
    /* Длинная линия выступает далеко за ручку: оболочка не должна
       перекрывать расположенные под ней фигуры. */
    pointer-events: none;
  }

  .line {
    position: absolute;
    overflow: visible;
    pointer-events: none;
    opacity: 0.9;
  }

  .march line {
    animation: march 5s linear infinite;
  }

  .flicker line {
    animation: flicker 4s ease-in-out infinite;
  }

  @keyframes march {
    to { stroke-dashoffset: -26; }
  }

  @keyframes flicker {
    50% { opacity: 0.25; }
  }

  /* Ручка: у уровня — широкая планка, у стадии — высокая. */
  .grip {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    border: 2px solid var(--line-strong);
    background: var(--panel-3);
    opacity: 0.35;
  }

  .divider:hover .grip,
  .divider.selected .grip {
    opacity: 1;
    border-color: var(--accent-2);
    background: var(--accent-2);
  }

  .divider.selected .grip {
    border-color: var(--accent);
    background: var(--accent);
  }

  /* Три насечки по центру — намёк «тяни меня». */
  .grip::after {
    content: '';
    position: absolute;
    inset: 0;
    margin: auto;
    background: #06110b;
    width: 18px;
    height: 2px;
    box-shadow: 0 -4px 0 #06110b, 0 4px 0 #06110b;
  }

  .vertical .grip::after {
    width: 2px;
    height: 18px;
    box-shadow: -4px 0 0 #06110b, 4px 0 0 #06110b;
  }

  .caption {
    position: absolute;
    pointer-events: none;
    font-size: 11px;
    line-height: 14px;
    color: var(--ink);
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 0 4px;
    white-space: nowrap;
    text-shadow: 1px 1px 0 #05080b;
  }

  /* Концы ленты — за них растягиваем. Цель клика больше метки за счёт ::before. */
  .stretch {
    position: absolute;
    top: 50%;
    pointer-events: auto;
    width: 11px;
    height: 11px;
    transform: translateY(-50%);
    background: var(--warn);
    border: 2px solid var(--ink-strong);
    box-shadow: 2px 2px 0 var(--ink-strong);
    cursor: ew-resize;
    z-index: 6;
  }

  .stretch::before {
    content: '';
    position: absolute;
    inset: -5px;
  }

  .stretch.start {
    left: -5px;
  }

  .stretch.end {
    right: -5px;
  }

  .vertical .stretch {
    left: 50%;
    right: auto;
    top: -5px;
    bottom: auto;
    transform: translateX(-50%);
    cursor: ns-resize;
  }

  .vertical .stretch.end {
    top: auto;
    bottom: -5px;
  }

  .del {
    position: absolute;
    top: -11px;
    pointer-events: auto;
    right: -11px;
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
    z-index: 2;
  }

  .vertical .del {
    top: -11px;
    left: -11px;
    right: auto;
  }

  .divider.selected .del {
    display: flex;
  }
</style>
