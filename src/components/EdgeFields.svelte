<script>
  // Общая форма свойств связи (надпись, стиль, тип линии, метка, направление).
  // Один блок для инспектора и контекстного меню — раньше форма была продублирована.
  import { ARROWS, EDGE_STYLES, LINE_DASHES, LINE_MARKERS } from '../lib/config.js';
  import { board } from '../lib/board.svelte.js';
  import { t } from '../lib/i18n.svelte.js';

  let { id } = $props();

  const edge = $derived(board.edges.find((e) => e.id === id));
</script>

{#if edge}
  <label class="field">
    <span>{t('edgeLabel')}</span>
    <input
      value={edge.data?.label || ''}
      oninput={(e) => board.editEdge(edge.id, { data: { label: e.target.value } }, { coalesce: true })}
    />
  </label>
  <label class="field">
    <span>{t('edgeStyle')}</span>
    <select value={edge.type || 'straight'} onchange={(e) => board.editEdge(edge.id, { type: e.target.value })}>
      {#each EDGE_STYLES as s (s)}<option value={s}>{t(s)}</option>{/each}
    </select>
  </label>
  <label class="field">
    <span>{t('lineDash')}</span>
    <select value={edge.data?.dash || 'solid'} onchange={(e) => board.editEdge(edge.id, { data: { dash: e.target.value } })}>
      {#each LINE_DASHES as s (s)}<option value={s}>{t(s)}</option>{/each}
    </select>
  </label>
  <label class="field">
    <span>{t('marker')}</span>
    <select value={edge.data?.marker || 'none'} onchange={(e) => board.editEdge(edge.id, { data: { marker: e.target.value } })}>
      {#each LINE_MARKERS as s (s)}<option value={s}>{t(s)}</option>{/each}
    </select>
  </label>
  <label class="field">
    <span>{t('direction')}</span>
    <select value={edge.data?.arrow || 'end'} onchange={(e) => board.editEdge(edge.id, { data: { arrow: e.target.value } })}>
      {#each ARROWS as s (s)}<option value={s}>{t(s)}</option>{/each}
    </select>
  </label>
{/if}

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field span {
    color: var(--ink-dim);
    font-family: var(--font-pixel);
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1.7;
  }

  input,
  select {
    width: 100%;
    font-size: 12px;
    text-transform: none;
  }
</style>
