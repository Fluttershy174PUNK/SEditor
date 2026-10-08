<script>
  // Своё ребро: стиль линии, надпись, метка (стрелка/треугольник/круг) и направление.
  // Один маркер на оба конца: auto-start-reverse разворачивает его для начала.
  // Пунктир медленно бежит, точки медленно мерцают — галочка «Анимация» в верхнем баре.
  import { EdgeLabel, getBezierPath, getSmoothStepPath, getStraightPath } from '@xyflow/svelte';
  import { board } from '../lib/board.svelte.js';

  let {
    id,
    type = 'straight',
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data = {},
    selected
  } = $props();

  const stroke = $derived(data?.stroke || '#cfe3f5');
  const width = $derived(Math.max(1, data?.width ?? 2));
  const dash = $derived(data?.dash === 'dashed' ? '8 5' : data?.dash === 'dotted' ? '2 4' : undefined);

  const path = $derived.by(() => {
    const params = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
    if (type === 'smoothstep') return getSmoothStepPath(params);
    if (type === 'step') return getSmoothStepPath({ ...params, borderRadius: 0 });
    if (type === 'bezier') return getBezierPath(params);
    return getStraightPath(params);
  });

  const [d, labelX, labelY] = $derived(path);
  const marker = $derived(data?.marker || 'none');
  const arrow = $derived(data?.arrow || 'end');
  const uid = $derived(`m${id}`);

  const showStart = $derived(marker !== 'none' && (arrow === 'start' || arrow === 'both'));
  const showEnd = $derived(marker !== 'none' && (arrow === 'end' || arrow === 'both'));
  // Круг сидит на самом конце линии, стрелка/треугольник — остриём.
  const refX = $derived(marker === 'circle' ? 7 : 13);

  const march = $derived(board.animate && data?.dash === 'dashed');
  const flicker = $derived(board.animate && data?.dash === 'dotted');
</script>

{#if showStart || showEnd}
  <defs>
    <marker
      id={uid}
      viewBox="0 0 14 14"
      {refX}
      refY="7"
      markerWidth="14"
      markerHeight="14"
      orient="auto-start-reverse"
      markerUnits="userSpaceOnUse"
    >
      {#if marker === 'arrow'}
        <polyline points="2,2 12,7 2,12" fill="none" stroke={stroke} stroke-width={width} />
      {:else if marker === 'triangle'}
        <polygon points="2,2 12,7 2,12" fill={stroke} />
      {:else}
        <circle cx="7" cy="7" r="4" fill={stroke} />
      {/if}
    </marker>
  </defs>
{/if}

<path
  {d}
  class:march
  class:flicker
  class:selected
  data-marker={marker}
  data-arrow={arrow}
  fill="none"
  stroke={selected ? 'var(--accent)' : stroke}
  stroke-width={width}
  stroke-dasharray={dash}
  marker-start={showStart ? `url(#${uid})` : undefined}
  marker-end={showEnd ? `url(#${uid})` : undefined}
/>
<path d={d} fill="none" stroke="transparent" stroke-width="18" />

{#if data?.label}
  <EdgeLabel x={labelX} y={labelY} transparent>
    <span class="edge-label">{data.label}</span>
  </EdgeLabel>
{/if}

<style>
  .edge-label {
    background: var(--panel);
    border: 2px solid var(--line-strong);
    color: var(--ink);
    padding: 0 4px;
    font-size: 11px;
    white-space: nowrap;
    display: inline-block;
  }

  /* Медленный бег пунктира: шаг — длина повтора паттерна (8+5) умноженная на 2. */
  .march {
    animation: march 5s linear infinite;
  }

  @keyframes march {
    to {
      stroke-dashoffset: -26;
    }
  }

  /* Точки медленно угасают и появляются. */
  .flicker {
    animation: flicker 4s ease-in-out infinite;
  }

  @keyframes flicker {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
    }
  }
</style>
