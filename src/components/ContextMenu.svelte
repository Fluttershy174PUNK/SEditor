<script>
  // Контекстное меню для узла / связи / пустого поля.
  import { PALETTE } from '../lib/config.js';
  import { board } from '../lib/board.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import EdgeFields from './EdgeFields.svelte';
  import PixelIcon from './PixelIcon.svelte';

  let { x, y, kind, id, flowPos, onclose } = $props();

  const edge = $derived(board.edges.find((e) => e.id === id));
  const node = $derived(board.nodes.find((n) => n.id === id));
  // Меню не должно уезжать за край экрана (правый клик у правой/нижней кромки).
  const clamp = (v, max) => Math.max(8, Math.min(v, max));
  const style = $derived({
    left: `${clamp(x, window.innerWidth - 210)}px`,
    top: `${clamp(y, window.innerHeight - 260)}px`
  });

  const act = (fn) => {
    fn?.();
    onclose();
  };
</script>

<svelte:window onpointerdown={(e) => !e.target?.closest?.('.ctx') && onclose()} onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="ctx" {style} role="menu" tabindex="-1">
  {#if kind === 'node' && node}
    <div class="title">{node.data?.label || t(node.data?.shape || 'shape')}</div>
    <button role="menuitem" onclick={() => act(() => board.duplicateNode(node.id))}><PixelIcon name="plus" size={12} />{t('duplicate')}</button>
    <button role="menuitem" onclick={() => act(() => board.deleteNodes([node.id]))}><PixelIcon name="minus" size={12} />{t('delete')}</button>
  {:else if kind === 'edge' && edge}
    <div class="title">{t('edgeProps')}</div>
    <EdgeFields id={edge.id} />
    <button role="menuitem" onclick={() => act(() => board.reverseEdge(edge.id))}>{t('reverse')}</button>
    <button role="menuitem" onclick={() => act(() => board.deleteEdge(edge.id))}>{t('delete')}</button>
  {:else}
    <div class="title">{t('palette')}</div>
    <div class="grid">
      {#each [...PALETTE.shapes, ...PALETTE.special, ...PALETTE.layout] as shape (shape)}
        <button
          class="cell"
          title={t(shape)}
          aria-label={t(shape)}
          onclick={() => act(() => board.addNode(shape, flowPos))}
        ><PixelIcon name={shape} size={14} /></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .ctx {
    position: fixed;
    z-index: 50;
    min-width: 190px;
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px;
    background: var(--panel);
    border: 2px solid var(--line-strong);
    box-shadow: 4px 4px 0 #05080b;
  }

  .title {
    color: var(--accent);
    font-family: var(--font-pixel);
    font-size: 9px;
    text-transform: uppercase;
    padding: 1px 2px 3px;
    border-bottom: 1px solid var(--line);
  }

  .ctx :global(button) {
    box-shadow: none;
    justify-content: flex-start;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 3px;
  }

  .cell {
    width: 26px;
    height: 26px;
    padding: 0;
  }
</style>
