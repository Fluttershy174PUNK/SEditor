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
  import { buildLauncher, editorUrlFromSchemaDir } from '../lib/launcher.js';
  import { downloadBlob, resolveOutputDir, writeFileToDir } from '../lib/fsHandles.js';
  import * as api from '../lib/api.js';
  import { t } from '../lib/i18n.svelte.js';

  let pngOpen = $state(false);
  let pngName = $state('');
  let pngFolder = $state('exports');
  let pngSize = $state('');
  let fileInput;
  let localFileHandle = null;
  let downloadHinted = false;
  // Путь схемы из ярлыка (hash ?p=) — цель для PNG/ярлыка, когда сервера нет.
  let schemaPathParam = '';
  // Режим без сервера: file:// с данными в hash (см. app/shortcut.html).
  let offline = $state(false);

  const fileName = () => `${(board.name || 'schema').replace(/[\\/:*?"<>|]/g, '-').replace(/\.json$/i, '')}.json`;
  const isPickerCancel = (error) => error?.name === 'AbortError';

  /** Данные схемы из hash ярлыка: #d=<json>&p=<путь>. */
  const readHashSchema = () => {
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    const data = params.get('d');
    if (!data) return null;
    return { text: data, path: params.get('p') || '' };
  };

  onMount(() => {
    const fromHash = readHashSchema();
    const path = new URLSearchParams(location.search).get('path');
    if (fromHash) {
      // Ярлык: схема уже внутри, сервер не нужен.
      offline = true;
      schemaPathParam = fromHash.path;
      try {
        board.loadSchema(JSON.parse(fromHash.text));
        board.path = fromHash.path || '';
      } catch (err) {
        board.notify(`${t('error')}: ${err.message}`, 'error');
      }
      // Данные в адресе не оставляем: перезагрузка страницы их не подхватит.
      history.replaceState(null, '', location.pathname + location.search);
    } else if (path) {
      board.openPath(path);
    } else if (location.protocol === 'file:') {
      offline = true;
      board.notify(t('offlineHint'), 'error');
    }
  });

  const loadLocalFile = async (file, handle = null) => {
    try {
      const data = JSON.parse(await file.text());
      board.loadSchema(data);
      if (!board.name) board.name = file.name.replace(/\.json$/i, '');
      board.path = file.name;
      localFileHandle = handle;
      board.notify(`${t('loaded')}: ${file.name}`);
    } catch (err) {
      board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const openRecentFile = async (path) => {
    try {
      const { data } = await api.readSchema(path);
      board.loadSchema(data);
      localFileHandle = null;
      board.notify(`${t('loaded')}: ${path}`);
    } catch (err) {
      board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const openFiles = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'SEditor schema', accept: { 'application/json': ['.json'] } }]
        });
        await loadLocalFile(await handle.getFile(), handle);
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
      if (handle.requestPermission && (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
        throw new Error(t('filePermissionDenied'));
      }
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      localFileHandle = handle;
    } else {
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        // Firefox/Safari не умеют showSaveFilePicker — напоминаем один раз за сессию.
        if (!downloadHinted) {
          downloadHinted = true;
          board.notify(t('saveAsBrowserHint'), 'error');
        }
      } catch (err) {
        board.notify(`${t('error')}: ${err.message}`, 'error');
      }
    }
  };

  /** Сохранить JSON схемы без сервера: папку выбирают один раз, handle живёт в IndexedDB. */
  const saveOffline = async () => {
    const name = fileName();
    const payload = board.payload();
    payload.meta.name = board.name || name.replace(/\.json$/i, '');
    const contents = JSON.stringify(payload, null, 2);
    const dir = await resolveOutputDir({ prompt: true });
    if (await writeFileToDir(dir, name, contents)) {
      board.path = name;
      board.dirty = false;
      board.notify(`${t('saved')}: ${name}`);
      // Ярлык рядом со схемой держим актуальным.
      if (schemaPathParam) await writeShortcutOffline();
      return true;
    }
    await writeLocalFile(null);
    return true;
  };

  const saveFile = async () => {
    if (offline) {
      try {
        return await saveOffline();
      } catch (err) {
        if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
        return false;
      }
    }
    if (!localFileHandle) return saveAsFiles();
    try {
      await writeLocalFile(localFileHandle);
      // Ярлык всегда соответствует последней сохранённой схеме.
      await api.createShortcut(board.path).catch(() => null);
    } catch (err) {
      if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const onFallbackFile = (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) loadLocalFile(file);
  };

  const stamp = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  };

  const openPng = () => {
    pngName = `${board.name || 'schema'}-${stamp()}`;
    pngFolder = 'exports';
    pngSize = '';
    pngOpen = true;
  };

  /** Перегенерировать ярлык без сервера: файл ложится рядом со схемой. */
  const writeShortcutOffline = async () => {
    const schemaPath = schemaPathParam;
    if (!schemaPath) throw new Error(t('shortcutNoDir'));
    const name = board.name || schemaPath.replace(/^.*\//, '').replace(/\.json$/i, '');
    const schema = board.payload();
    schema.meta.name = name;
    const html = buildLauncher({
      schema,
      name,
      schemaPathFromAppDir: schemaPath,
      editorUrl: editorUrlFromSchemaDir(schemaPath)
    });
    const dir = await resolveOutputDir({ prompt: true });
    if (await writeFileToDir(dir, `${name}.html`, html)) return `${name}.html`;
    downloadBlob(new Blob([html], { type: 'text/html' }), `${name}.html`);
    throw new Error(t('offlineSaveHint'));
  };

  const openShortcut = async () => {
    if (!board.path && !schemaPathParam) {
      board.notify(t('shortcutNoDir'), 'error');
      return;
    }
    if (board.dirty) {
      const saved = await board.save();
      if (!saved || board.dirty) return;
    }
    try {
      if (offline) {
        const written = await writeShortcutOffline();
        board.notify(`${t('shortcutWritten')}: ${written}`);
        return;
      }
      const result = await api.createShortcut(board.path);
      if (!result.saved) throw new Error('Backend не подтвердил создание ярлыка.');
      board.notify(`${t('shortcutWritten')}: ${result.path}`);
    } catch (err) {
      if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const savePng = async () => {
    try {
      const { dataUrl, width, height } = exportPng({ nodes: board.nodes, edges: board.edges, title: board.name });
      pngSize = `${width}×${height}`;
      const filename = `${(pngName || 'schema').replace(/\.png$/i, '')}.png`;
      if (offline) {
        // Рядом со схемой: папку выбирают один раз, handle живёт в IndexedDB.
        const dir = await resolveOutputDir({ prompt: true });
        const blob = await (await fetch(dataUrl)).blob();
        if (await writeFileToDir(dir, filename, blob)) {
          board.notify(`${t('saved')}: ${filename}`);
          pngOpen = false;
          return;
        }
        downloadBlob(blob, filename);
        board.notify(`${t('offlineSaveHint')} (${filename})`, 'error');
        pngOpen = false;
        return;
      }
      const folder = (pngFolder || '').replace(/^\/+|\/+$/g, '');
      const path = `${folder ? `${folder}/` : ''}${filename}`;
      const result = await api.writePng(path, dataUrl);
      board.notify(`${t('saved')}: ${result.path}`);
      pngOpen = false;
    } catch (err) {
      if (!isPickerCancel(err)) board.notify(`${t('error')}: ${err.message}`, 'error');
    }
  };

  const isTyping = (target) => {
    const tag = target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
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

  // Горячие клавиши: undo/redo, save, выделение, дублирование, удаление, сдвиг.
  const onKey = (event) => {
    if (isTyping(event.target)) return;
    if (pngOpen) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (mod && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) board.redo();
      else board.undo();
      return;
    }
    if (mod && key === 'y') {
      event.preventDefault();
      board.redo();
      return;
    }
    if (mod && key === 's') {
      event.preventDefault();
      saveFile();
      return;
    }
    if (mod && key === 'a') {
      event.preventDefault();
      selectAll();
      return;
    }
    if (mod && key === 'd') {
      event.preventDefault();
      duplicateSelection();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!board.selectedNodes.length && !board.selectedEdges.length) return;
      event.preventDefault();
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
      event.preventDefault();
      nudge(...moves[event.key]);
    }
  };

  const onBeforeUnload = (event) => {
    if (!board.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };

</script>

<svelte:window onkeydown={onKey} onbeforeunload={onBeforeUnload} />

<SvelteFlowProvider>
  <TopBar onopen={openFiles} onopenrecent={openRecentFile} onsave={saveFile} onsaveto={saveAsFiles} onpng={openPng} onshortcut={openShortcut} />
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
    <div>
      <label for="png-folder">{t('pngFolder')}</label>
      <input id="png-folder" bind:value={pngFolder} />
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
