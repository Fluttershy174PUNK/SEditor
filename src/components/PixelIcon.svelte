<script>
  // Иконка: рисует примитивы из lib/icons.js в сетке 16×16.
  // Линии и контуры — векторные, поэтому выглядят чисто на любом размере.
  import { ICON_VIEWBOX, iconFor } from '../lib/icons.js';

  let { name, size = 16, title = '', stroke = 1.5 } = $props();
  const icon = $derived(iconFor(name));
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 {ICON_VIEWBOX} {ICON_VIEWBOX}"
  role={title ? 'img' : 'presentation'}
  aria-label={title || undefined}
  aria-hidden={title ? undefined : 'true'}
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="square"
  stroke-linejoin="miter"
>
  {#each icon.prims as prim}
    {#if prim[0] === 'rect'}
      <rect x={prim[1]} y={prim[2]} width={prim[3]} height={prim[4]} stroke-dasharray={icon.dashed ? '2.5 2' : undefined} />
    {:else if prim[0] === 'line'}
      <line x1={prim[1]} y1={prim[2]} x2={prim[3]} y2={prim[4]} />
    {:else if prim[0] === 'circle'}
      <circle cx={prim[1]} cy={prim[2]} r={prim[3]} />
    {:else if prim[0] === 'ellipse'}
      <ellipse cx={prim[1]} cy={prim[2]} rx={prim[3]} ry={prim[4]} />
    {:else if prim[0] === 'dot'}
      <circle cx={prim[1]} cy={prim[2]} r={prim[3]} fill="currentColor" stroke="none" />
    {:else if prim[0] === 'poly'}
      <polygon points={prim[1].map(([x, y]) => `${x},${y}`).join(' ')} fill={prim[2] ? 'currentColor' : 'none'} stroke-dasharray={icon.dashed ? '2.5 2' : undefined} />
    {:else if prim[0] === 'path'}
      <path d={prim[1]} />
    {/if}
  {/each}
</svg>
