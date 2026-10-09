<script>
  // Верхний бар: имя схемы, последние схемы, путь, файл-операции, undo/redo, сетка, PNG, язык.
  import { useSvelteFlow } from '@xyflow/svelte';
  import { board } from '../lib/board.svelte.js';
  import { i18n, t } from '../lib/i18n.svelte.js';
  import PixelIcon from './PixelIcon.svelte';

  const flow = useSvelteFlow();

  let { onopen = () => {}, onopenrecent = () => {}, onsave = () => {}, onsaveto = () => {}, onpng = () => {}, onshortcut = () => {} } = $props();

  let editingName = $state(false);
  let nameInput = $state('');
  let showRecent = $state(false);

  const startEdit = () => {
    nameInput = board.name;
    editingName = true;
  };

  const commitName = () => {
    editingName = false;
    const value = nameInput.trim();
    if (value && value !== board.name) {
      board.renameTo(value);
    }
  };

  const openRecent = async () => {
    showRecent = !showRecent;
    if (showRecent) await board.refreshRecent();
  };

  const pickRecent = (item) => {
    showRecent = false;
    onopenrecent(item.path);
  };

  // Выпадающий список закрывается по клику мимо и по Escape.
  const onWindowPointer = (e) => {
    if (showRecent && !e.target?.closest?.('.recent')) showRecent = false;
  };
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={(e) => e.key === 'Escape' && (showRecent = false)} />

<header class="top">
  <div class="brand" title={t('appTitle')}>SE</div>

  <div class="name">
    {#if editingName}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        autofocus
        bind:value={nameInput}
        onblur={commitName}
        onchange={commitName}
        onkeydown={(e) => {
          if (e.key === 'Enter') commitName();
          if (e.key === 'Escape') editingName = false;
        }}
      />
    {:else}
      <button class="plain" onclick={startEdit} title={t('schemaName')}>
        {board.name || t('untitled')}
        {#if board.dirty}<span class="dot">*</span>{/if}
      </button>
    {/if}
  </div>

  <div class="recent">
    <button class:active={showRecent} onclick={openRecent} title={t('recent')}>
      <PixelIcon name="list" size={12} />{t('recent')}
    </button>
    {#if showRecent}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <ul class="dropdown" role="menu">
        {#if board.recent.length}
          {#each board.recent as item (item.path)}
            <li>
              <button role="menuitem" onclick={() => pickRecent(item)}>
                <span class="nm">{item.name}</span>
                <span class="pth">{item.path}</span>
              </button>
            </li>
          {/each}
        {:else}
          <li class="empty">{t('recentEmpty')}</li>
        {/if}
      </ul>
    {/if}
  </div>

  <div class="path" title={board.path || t('noPath')}>
    {board.path || t('noPath')}
  </div>

  <div class="group">
    <button onclick={onopen} title={t('open')} aria-label={t('open')}>
      <PixelIcon name="open" size={14} /><span>{t('open')}</span>
    </button>
    <button onclick={onsave} title={t('save')} aria-label={t('save')}>
      <PixelIcon name="save" size={14} /><span>{t('save')}</span>
    </button>
    <button onclick={onsaveto} title={t('saveAs')} aria-label={t('saveAs')}>
      <PixelIcon name="saveAs" size={14} /><span>{t('saveAs')}</span>
    </button>
    {#if board.path}
      <button onclick={onshortcut} title="Создать HTML-ярлык" aria-label="Создать HTML-ярлык">
        HTML
      </button>
    {/if}
  </div>

  <div class="group">
    <button disabled={!board.history.canUndo} onclick={() => board.undo()} title={t('undo')} aria-label={t('undo')}>
      <PixelIcon name="undo" size={14} /><span>{t('undo')}</span>
    </button>
    <button disabled={!board.history.canRedo} onclick={() => board.redo()} title={t('redo')} aria-label={t('redo')}>
      <PixelIcon name="redo" size={14} /><span>{t('redo')}</span>
    </button>
  </div>

  <div class="group">
    <button
      class:active={board.showGrid}
      onclick={() => (board.showGrid = !board.showGrid)}
      title={t('grid')}
      aria-label={t('grid')}
      aria-pressed={board.showGrid}
    >
      <PixelIcon name="grid" size={14} /><span>{t('grid')}</span>
    </button>
    <button
      class:active={board.snap}
      onclick={() => (board.snap = !board.snap)}
      title={t('snap')}
      aria-label={t('snap')}
      aria-pressed={board.snap}
    >
      <PixelIcon name="snap" size={14} /><span>{t('snap')}</span>
    </button>
  </div>

  <label class="check">
    <input type="checkbox" checked={board.animate} onchange={(e) => board.setAnimate(e.target.checked)} />
    {t('animate')}
  </label>

  <div class="spacer"></div>

  <button onclick={() => flow.fitView({ padding: 0.2 })} title={t('fit')} aria-label={t('fit')}>
    <PixelIcon name="fit" size={14} /><span>{t('fit')}</span>
  </button>
  <button onclick={onpng} title={t('exportPng')} aria-label={t('exportPng')}>
    <PixelIcon name="png" size={14} /><span>{t('exportPng')}</span>
  </button>
  <button class="lang" onclick={() => i18n.toggle()} title={t('languages')} aria-label={t('languages')}>
    {i18n.other.toUpperCase()}
  </button>
</header>

<style>
  .top {
    grid-area: top;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: var(--panel);
    border-bottom: 2px solid var(--line);
    min-height: 40px;
  }

  .brand {
    background: var(--accent);
    color: var(--ink-strong);
    padding: 3px 5px;
    font-family: var(--font-pixel);
    font-size: 12px;
    border: var(--px) solid var(--ink-strong);
  }

  .name {
    min-width: 120px;
    max-width: 240px;
  }

  .name input {
    width: 100%;
  }

  button.plain {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    color: var(--accent-2);
    font-size: 10px;
    padding: 3px 4px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  button.plain:hover {
    border-color: var(--line);
    background: var(--panel-2);
  }

  .dot {
    color: var(--warn);
  }

  .recent {
    position: relative;
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    margin: 0;
    padding: 4px;
    list-style: none;
    min-width: 280px;
    max-height: 50vh;
    overflow-y: auto;
    background: var(--panel);
    border: 2px solid var(--line-strong);
    box-shadow: 4px 4px 0 #05080b;
    z-index: 40;
  }

  .dropdown :global(button) {
    width: 100%;
    box-shadow: none;
    justify-content: flex-start;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    /* Имена файлов — моноширинный, их читают, а не «жмут». */
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .nm {
    color: var(--ink);
  }

  .pth {
    color: var(--ink-dim);
    font-size: 10px;
  }

  .empty {
    padding: 4px;
    color: var(--ink-dim);
  }

  .path {
    flex: 1 1 120px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink-dim);
    font-size: 11px;
    border: 2px solid var(--line);
    background: var(--panel-2);
    padding: 3px 5px;
  }

  .group {
    display: flex;
    gap: 3px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--ink-dim);
    cursor: pointer;
    padding: 0 2px;
  }

  .check input {
    padding: 0;
  }

  .spacer {
    flex: 1 1 auto;
  }

  .lang {
    min-width: 34px;
  }

  button :global(svg) {
    flex: 0 0 auto;
  }
</style>
