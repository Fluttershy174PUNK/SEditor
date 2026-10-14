<script>
  import { onMount } from 'svelte';
  // Оболочка редактора: бар, холст, палитра, инспектор, нижняя строка,
  // модалка PNG и общие горячие клавиши.
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import TopBar from './TopBar.svelte';
  import FlowCanvas from './FlowCanvas.svelte';
  import Palette from './Palette.svelte';
  import Inspector from './Inspector.svelte';
  import BottomBar from './BottomBar.svelte';
  import Dialog from './Dialog.svelte';
  import { board } from '../lib/board.svelte.js';
  import { SHAPES, isDivider } from '../lib/config.js';
  import { exportPng } from '../lib/exportPng.js';
  import { buildStandaloneEditor } from '../lib/launcher.js';
  import { downloadBlob, ensureAccess, listRecentHandles, recentHandlePickerAvailable, rememberFileHandle } from '../lib/fsHandles.js';
  import { handleClipboardShortcut, shouldIgnoreEditorShortcut, shortcutKey } from '../lib/editorShortcuts.js';
  import { t } from '../lib/i18n.svelte.js';

  let pngOpen = $state(false);
  let pngName = $state('');
  let pngSize = $state('');
  let fileInput;
  let localFileHandle = null;
  let downloadHinted = false;
  let clipboard = null;

  const fileName = () => `${(board.name || 'schema').replace(/[\\/:*?"<>|]/g, '-').replace(/\.json$/i, '')}.json`;
  const isPickerCancel = (error) => error?.name === 'AbortError';

  /** Данные схемы из hash ярлыка: #d=<json>&p=<путь>. */
  const readHashSchema = () => {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    const data = params.get('d');
    if (!data) return null;
    return { text: data };
  };

  let { initialSchema = null } = $props();

  const onHashChange = () => {
    const embedded = readHashSchema();
    if (!embedded) return;
    try {
      board.loadSchema(JSON.parse(embedded.text));
      history.replaceState(null, '', location.pathname + location.search);
    } catch (err) {
      board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  onMount(async () => {
    window.addEventListener('hashchange', onHashChange);
    if (initialSchema) {
      board.loadSchema(initialSchema);
      return () => window.removeEventListener('hashchange', onHashChange);
    }
    const standaloneData = document.getElementById('seditor-schema')?.textContent;
    if (standaloneData) {
      try {
        board.loadSchema(JSON.parse(standaloneData));
      } catch (err) {
        board.notify(`${t('error')}: ${err.message}`, 'error');
      }
      return () => window.removeEventListener('hashchange', onHashChange);
    }
    const fromHash = readHashSchema();
    if (fromHash) {
      // Legacy schema launchers pass their JSON in the URL hash.
      try {
        board.loadSchema(JSON.parse(fromHash.text));
      } catch (err) {
        board.notify(`${t('error')}: ${err.message}`, 'error');
      }
      // Данные в адресе не оставляем: перезагрузка страницы их не подхватит.
      history.replaceState(null, '', location.pathname + location.search);
    } else {
      board.recent = await listRecentHandles();
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  });

  const loadLocalFile = async (file, handle = null) => {
    try {
      const data = JSON.parse(await file.text());
      board.loadSchema(data);
      if (!board.name) board.name = file.name.replace(/\.json$/i, '');
      board.path = file.name;
      localFileHandle = handle;
      if (handle && recentHandlePickerAvailable) board.recent = await rememberFileHandle(handle);
      board.notify(`${t('loaded')}: ${file.name}`);
    } catch (err) {
      board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const openRecentFile = async (recent) => {
    try {
      if (!recent.handle) throw new Error(t('recentUnavailable'));
      if (!(await ensureAccess(recent.handle, 'read'))) throw new Error(t('filePermissionDenied'));
      await loadLocalFile(await recent.handle.getFile(), recent.handle);
    } catch (err) {
      if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const openFiles = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'SEditor schema', accept: { 'application/json': ['.json'] } }]
        });
        await loadLocalFile(await handle.getFile(), recentHandlePickerAvailable ? handle : null);
      } catch (err) {
        if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
      }
    } else {
      fileInput?.click();
    }
  };

  const writeLocalFile = async (handle) => {
    const name = fileName();
    const payload = board.payload();
    payload.meta.name = board.name || name.replace(/\.json$/i, '');
    const contents = JSON.stringify(payload, null, 2);
    if (handle) {
      if (!(await ensureAccess(handle))) throw new Error(t('filePermissionDenied'));
      const writable = await handle.createWritable();
      try {
        await writable.write(contents);
        await writable.close();
      } catch (error) {
        await writable.abort().catch(() => null);
        throw error;
      }
      localFileHandle = handle;
      if (recentHandlePickerAvailable) board.recent = await rememberFileHandle(handle);
    } else {
      downloadBlob(new Blob([contents], { type: 'application/json' }), name);
    }
    board.path = handle?.name || name;
    board.dirty = false;
    board.notify(`${t('saved')}: ${board.path}`);
  };

  const saveAsFiles = async () => {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName(),
          types: [{ description: 'SEditor schema', accept: { 'application/json': ['.json'] } }]
        });
        await writeLocalFile(handle);
      } catch (err) {
        if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
      }
    } else {
      try {
        await writeLocalFile(null);
        // Older browsers fall back to the standard download flow.
        if (!downloadHinted) {
          downloadHinted = true;
          board.notify(t('saveAsBrowserHint'), 'error');
        }
      } catch (err) {
        board.notify(`${t('error')}: ${err.message}`, 'error');
      }
    }
  };

  const saveFile = async () => {
    if (localFileHandle) {
      try {
        await writeLocalFile(localFileHandle);
        return;
      } catch (err) {
        if (isPickerCancel(err)) return;
        board.notify(`${t('error')}: ${err.message}`, 'error');
      }
    }
    await saveAsFiles();
  };

  const onFallbackFile = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) await loadLocalFile(file);
  };

  const exportLauncher = async () => {
    try {
      const schema = board.payload();
      schema.meta.name = board.name || schema.meta.name || 'schema';
      const source = window.__SEDITOR_TEMPLATE_HTML__;
      if (!source) throw new Error('Standalone template unavailable');
      const html = buildStandaloneEditor(source, schema);
      downloadBlob(new Blob([html], { type: 'text/html' }), `${fileName().replace(/\.json$/i, '')}.html`);
    } catch (err) {
      board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const stamp = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  };

  const openPng = () => {
    pngName = `${board.name || 'schema'}-${stamp()}`;
    pngSize = '';
    pngOpen = true;
  };

  /** Export a portable one-file copy of the editor with this schema embedded. */


  const savePng = async () => {
    try {
      const { dataUrl, width, height } = exportPng({ nodes: board.nodes, edges: board.edges, title: board.name });
      pngSize = `${width}×${height}`;
      const filename = `${(pngName || 'schema').replace(/\.png$/i, '')}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, filename);

      pngOpen = false;
    } catch (err) {
      if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  /** Выделить всё на поле. */
  const selectAll = () =>
    board.selectNodes(
      board.nodes.filter((n) => !n.hidden).map((n) => n.id),
      board.edges.filter((e) => !e.hidden).map((e) => e.id)
    );

  /** Сдвиг выделенного стрелками (Shift — крупный шаг). */
  const nudge = (dx, dy) => {
    if (!board.selectedNodes.length) return;
    board.mark(true);
    const step = { x: dx, y: dy };
    for (const id of board.selectedNodes) {
      const node = board.nodes.find((n) => n.id === id);
      if (!node) continue;
      // Разделитель двигается только по своей оси.
      if (isDivider(node.data?.shape)) {
        const horizontal = SHAPES[node.data.shape].divider === 'horizontal';
        board.updateNode(id, {
          position: {
            x: node.position.x + (horizontal ? 0 : step.x),
            y: node.position.y + (horizontal ? step.y : 0)
          }
        });
      } else {
        board.updateNode(id, { position: { x: node.position.x + step.x, y: node.position.y + step.y } });
      }
    }
    board.syncExtent();
  };

  // Удаление выделенного: узлы + связи одним шагом истории (см. board.deleteNodes).
  const deleteSelection = () => board.deleteNodes(board.selectedNodes, board.selectedEdges);

  const duplicateSelection = () => {
    if (!board.selectedNodes.length) return;
    board.duplicateNodes([...board.selectedNodes]);
  };

  const consumeShortcut = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Горячие клавиши: undo/redo, save, выделение, дублирование, удаление, сдвиг.
  const onKey = (event) => {
    if (shouldIgnoreEditorShortcut(event)) return;
    if (pngOpen) return;
    if (handleClipboardShortcut(event, board, { get value() { return clipboard; }, set value(value) { clipboard = value; } })) return;

    const mod = event.ctrlKey || event.metaKey;
    const key = shortcutKey(event);

    if (mod && key === 'y') {
      consumeShortcut(event);
      board.redo();
      return;
    }
    if (mod && key === 's') {
      consumeShortcut(event);
      saveFile();
      return;
    }
    if (mod && key === 'a') {
      consumeShortcut(event);
      selectAll();
      return;
    }
    if (mod && key === 'd') {
      consumeShortcut(event);
      duplicateSelection();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!board.selectedNodes.length && !board.selectedEdges.length) return;
      consumeShortcut(event);
      deleteSelection();
      return;
    }
    if (event.key === 'Escape') {
      board.selectNodes([]);
      return;
    }

    // Стрелки: ±1, с Shift — ±10 (сетка 8/привязка учитывается в board.syncExtent).
    const step = event.shiftKey ? 10 : 1;
    const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (moves[event.key]) {
      if (!board.selectedNodes.length) return;
      consumeShortcut(event);
      nudge(...moves[event.key]);
    }
  };

  onMount(() => {
    const onKeyCapture = (event) => {
      if (!event.defaultPrevented) onKey(event);
    };
    window.addEventListener('keydown', onKeyCapture, true);
    return () => window.removeEventListener('keydown', onKeyCapture, true);
  });

  const onBeforeUnload = (event) => {
    if (!board.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };


</script>

<svelte:window onbeforeunload={onBeforeUnload} />

<SvelteFlowProvider>
  <TopBar onopen={openFiles} onopenrecent={openRecentFile} onsave={saveFile} onpng={openPng} onshortcut={exportLauncher} />
  <FlowCanvas />
  <!-- Правая колонка: палитра сверху, свойства под ней. -->
  <aside class="sidebar">
    <Palette />
    <Inspector />
  </aside>
  <BottomBar />
</SvelteFlowProvider>

<input bind:this={fileInput} class="file-input" type="file" accept=".json,application/json" onchange={onFallbackFile} />

{#if pngOpen}
  <Dialog title={t('pngDialog')} onclose={() => (pngOpen = false)}>
    <div>
      <label for="png-name">{t('fileName')}</label>
      <input id="png-name" bind:value={pngName} />
    </div>

    {#if pngSize}<p class="size">{pngSize}</p>{/if}
    {#snippet footer()}
      <button onclick={() => (pngOpen = false)}>{t('cancel')}</button>
      <button class="primary" onclick={savePng}>{t('confirm')}</button>
    {/snippet}
  </Dialog>
{/if}

<style>
  .sidebar {
    grid-area: side;
    display: flex;
    flex-direction: column;
    width: 268px;
    min-height: 0;
    overflow: hidden;
    background: var(--panel);
    border-left: 2px solid var(--line);
  }

  .size {
    color: var(--ink-dim);
  }

  .file-input {
    position: fixed;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  :global(button.primary) {
    background: var(--accent);
    color: #06110b;
    border-color: var(--accent);
  }
</style>
