<script>
  // Нижняя строка: координаты, количество элементов, выделение, тосты, статус.
  import { onMount } from 'svelte';
  import { version as VERSION } from '../../app/version.json';
  import { board } from '../lib/board.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import { useSvelteFlow } from '@xyflow/svelte';

  const flow = useSvelteFlow();

  const cursor = $state({ x: 0, y: 0 });
  let latest = $state('');
  const isNewer = (candidate) => {
    const currentParts = VERSION.split('.').map(Number);
    const candidateParts = candidate.split('.').map(Number);
    for (let i = 0; i < Math.max(currentParts.length, candidateParts.length); i += 1) {
      const diff = (candidateParts[i] || 0) - (currentParts[i] || 0);
      if (diff) return diff > 0;
    }
    return false;
  };

  onMount(async () => {
    if (window.__SEDITOR_INITIAL_SCHEMA__) return;
    try {
      const response = await fetch('https://api.github.com/repos/Fluttershy174PUNK/SEditor/releases/latest');
      if (response.ok) {
        const tag = (await response.json()).tag_name.replace(/^v/, '');
        if (/^\d+(\.\d+){1,2}$/.test(tag) && isNewer(tag)) latest = tag;
      }
    } catch {}
  });

  // Тост гаснет сам, чтобы не висел вечно.
  $effect(() => {
    if (!board.toast) return;
    const timer = setTimeout(() => (board.toast = null), 3200);
    return () => clearTimeout(timer);
  });

  // Координаты курсора — не чаще кадра: pointermove стреляет на каждый пиксель.
  let pending = null;
  const onMove = (event) => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      const pos = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      cursor.x = Math.round(pos.x);
      cursor.y = Math.round(pos.y);
    });
  };
</script>

<svelte:window onpointermove={onMove} />

<footer class="bottom" title={t('shortcutsHint')}>
  <span class="cell">x: {cursor.x} y: {cursor.y}</span>
  <span class="cell">nodes: {board.nodes.length}</span>
  <span class="cell">edges: {board.edges.length}</span>
  <span class="cell">zoom: {Math.round((board.viewport?.zoom ?? 1) * 100)}%</span>
  {#if board.selectedNodes.length || board.selectedEdges.length}
    <span class="cell sel">sel: {board.selectedNodes.length}/{board.selectedEdges.length}</span>
  {/if}
  <span class="grow"></span>
  {#if board.busy}<span class="cell busy" role="status">...</span>{/if}
  {#if board.toast}
    <span class="toast" class:error={board.toast.kind === 'error'} class:animated={board.animate} role="status">{board.toast.message}</span>
  {/if}
  <a class="utility" href="https://github.com/Fluttershy174PUNK/SEditor" target="_blank" rel="noreferrer" aria-label="GitHub SEditor">GitHub</a>
  {#if latest}
    <span class="utility update">SEditor v{latest} — {t('updateAvailable')}</span>
    <a class="utility" href="https://github.com/Fluttershy174PUNK/SEditor/releases/latest" target="_blank" rel="noreferrer">{t('update')}</a>
  {:else}
    <span class="utility">v{VERSION}</span>
  {/if}
</footer>

<style>
  .bottom {
    grid-area: bottom;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px 6px;
    background: var(--panel);
    border-top: 2px solid var(--line);
    /* HUD как на приставке: пиксельный шрифт. */
    font-family: var(--font-pixel);
    font-size: 8px;
    letter-spacing: 0.02em;
    min-height: 24px;
  }

  .cell {
    padding: 0 6px;
    color: var(--ink-dim);
    border-right: 1px solid var(--line);
  }

  .sel {
    color: var(--accent);
  }

  .busy {
    color: var(--warn);
  }

  .grow {
    flex: 1 1 auto;
  }

  .toast {
    color: var(--accent);
    padding: 0 6px;
  }

  .toast.error {
    color: var(--err);
  }

  .utility {
    flex: 0 0 auto;
    padding: 0 5px;
    color: var(--ink-dim);
    font: inherit;
    text-decoration: none;
  }

  .update {
    color: var(--warn);
  }

  /* Мигающий курсор после сообщения — привет из 8-бит. */
  .toast.animated::after {
    content: '▮';
    margin-left: 4px;
    animation: blink 1s steps(1) infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

</style>
