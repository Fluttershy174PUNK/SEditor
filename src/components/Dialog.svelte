<script>
  // Модальное окно-рамка: заголовок, содержимое (snippet), футер с кнопками.
  import { t } from '../lib/i18n.svelte.js';

  let { title = '', onclose, children, footer } = $props();

  let dialogEl = $state(null);

  // При открытии фокус уходит внутрь диалога — клавиатура сразу работает в нём.
  $effect(() => {
    const target = dialogEl?.querySelector('.body input, .body select, .body textarea') ?? dialogEl;
    target?.focus();
  });
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose?.()} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose?.()}>
  <div class="dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" bind:this={dialogEl}>
    <div class="bar">
      <span class="title">{title}</span>
      <button onclick={() => onclose?.()} aria-label={t('cancel')} title={t('cancel')}>×</button>
    </div>
    <div class="body">{@render children?.()}</div>
    {#if footer}<div class="footer">{@render footer()}</div>{/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(5 8 11 / 70%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    min-width: 340px;
    max-width: 90vw;
    background: var(--panel);
    border: 2px solid var(--line-strong);
    box-shadow: 6px 6px 0 #05080b;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 3px 3px 3px 7px;
    background: var(--panel-3);
    border-bottom: 2px solid var(--line);
  }

  .title {
    color: var(--accent);
    text-transform: uppercase;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.08em;
  }

  .bar button {
    width: 22px;
    height: 20px;
    padding: 0;
    box-shadow: none;
  }

  .body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 7px;
    border-top: 2px solid var(--line);
    background: var(--panel-2);
  }

  .body :global(input),
  .body :global(select) {
    width: 100%;
  }

  .body :global(label) {
    display: block;
    margin-bottom: 2px;
  }
</style>
