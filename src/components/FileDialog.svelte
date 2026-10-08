<script>
  // Диалог файла: браузер по любой директории диска (открыть / сохранить как).
  // Папки открываются кликом, файл выбирается, имя можно набрать руками —
  // абсолютный путь работает в любом режиме.
  import Dialog from './Dialog.svelte';
  import * as api from '../lib/api.js';
  import { t } from '../lib/i18n.svelte.js';
  import PixelIcon from './PixelIcon.svelte';

  let { mode = 'open', initial = '', ondone } = $props();

  let cwd = $state('');
  let name = $state('');
  let dirs = $state([]);
  let files = $state([]);
  let problem = $state('');

  const lastDir = () => {
    try {
      return localStorage.getItem('seditor.lastDir') || '';
    } catch {
      return '';
    }
  };
  const remember = (dir) => {
    try {
      localStorage.setItem('seditor.lastDir', dir);
    } catch {}
  };

  const join = (dir, file) => `${dir.replace(/\/+$/, '')}/${file}`;
  const parentOf = (p) => p.replace(/\/+$/, '').replace(/\/[^/]*$/, '') || '/';

  async function browse(dir) {
    try {
      const listing = await api.listDir(dir);
      cwd = listing.path;
      dirs = listing.dirs;
      files = listing.files;
      problem = '';
    } catch (err) {
      problem = err.message;
    }
  }

  // Старт: папка файла из initial, иначе последняя использованная, иначе корень проекта.
  (() => {
    const withSlash = initial.includes('/');
    name = withSlash ? initial.slice(initial.lastIndexOf('/') + 1) : initial;
    browse(withSlash ? parentOf(initial) : lastDir());
  })();

  // Полный путь: абсолютный — как есть, иначе относительно просматриваемой папки.
  const fullPath = () => {
    const file = name.trim();
    return file.startsWith('/') ? file : join(cwd, file);
  };

  const pick = (file) => (name = file);
  const openFile = (file) => {
    name = file;
    submit();
  };

  const submit = () => {
    const file = name.trim();
    if (!file) return;
    const target = mode === 'open' ? fullPath() : /\.json$/i.test(fullPath()) ? fullPath() : `${fullPath()}.json`;
    remember(target.includes('/') ? parentOf(target) : cwd);
    ondone?.(target);
  };
</script>

<Dialog title={mode === 'open' ? t('open') : t('saveAs')} onclose={() => ondone?.(null)}>
  <div class="bar">
    <button class="up" title={t('folderUp')} aria-label={t('folderUp')} onclick={() => browse(parentOf(cwd))}>↑</button>
    <input
      class="path"
      value={cwd}
      aria-label={t('folder')}
      onkeydown={(e) => e.key === 'Enter' && browse(e.currentTarget.value)}
    />
  </div>

  <ul class="listing">
    {#each dirs as d (d.name)}
      <li>
        <button type="button" class="entry" onclick={() => browse(join(cwd, d.name))}>
          <PixelIcon name="folder" size={12} /><span class="nm">{d.name}</span>
        </button>
      </li>
    {/each}
    {#each files as f (f.name)}
      <li>
        <button
          type="button"
          class="entry"
          class:active={name === f.name}
          onclick={() => pick(f.name)}
          ondblclick={() => openFile(f.name)}
        >
          <PixelIcon name="file" size={12} /><span class="nm">{f.name}</span>
          <small>{new Date(f.mtime).toISOString().slice(0, 10)}</small>
        </button>
      </li>
    {/each}
    {#if !dirs.length && !files.length}<li class="hint">{problem || t('dirEmpty')}</li>{/if}
  </ul>

  <div>
    <label for="file-name">{t('fileName')}</label>
    <input id="file-name" bind:value={name} onkeydown={(e) => e.key === 'Enter' && submit()} placeholder="schema.json" />
  </div>

  {#snippet footer()}
    <button onclick={() => ondone?.(null)}>{t('cancel')}</button>
    <button class="primary" disabled={!name.trim()} onclick={submit}>
      {mode === 'open' ? t('open') : t('confirm')}
    </button>
  {/snippet}
</Dialog>

<style>
  .bar {
    display: flex;
    gap: 4px;
  }

  .bar .up {
    flex: 0 0 auto;
  }

  .path {
    flex: 1 1 auto;
    min-width: 0;
  }

  .listing {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 42vh;
    overflow-y: auto;
    border: 2px solid var(--line);
    background: var(--panel-2);
    padding: 4px;
  }

  .entry {
    width: 100%;
    justify-content: flex-start;
    gap: 6px;
    box-shadow: none;
    /* Имена файлов — моноширинный: их читают, а не «жмут». */
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: none;
    letter-spacing: 0;
  }

  .entry.active {
    background: var(--accent);
    color: var(--ink-strong);
  }

  .nm {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  small {
    color: var(--ink-dim);
    font-size: 10px;
    flex: 0 0 auto;
  }

  .entry.active small {
    color: var(--ink-strong);
  }

  .hint {
    margin: 0;
    padding: 4px;
    color: var(--ink-dim);
  }
</style>
