// Постоянный доступ к папке схемы в режиме без сервера (file://).
// Пользователь один раз выбирает папку, handle переживает перезагрузку в IndexedDB.
const DB = 'seditor-fs';
const STORE = 'handles';
const KEY = 'schema-dir';

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const idb = async (mode, run) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
};

export const loadDirHandle = () => idb('readonly', (store) => store.get(KEY)).catch(() => null);
export const saveDirHandle = (handle) => idb('readwrite', (store) => store.put(handle, KEY)).catch(() => null);

/** Разрешение на запись: спрашиваем заново, если браузер его сбросил. */
export const ensureWrite = async (handle) => {
  if (!handle) return false;
  const options = { mode: 'readwrite' };
  if ((await handle.queryPermission?.(options)) === 'granted') return true;
  return (await handle.requestPermission?.(options)) === 'granted';
};

/**
 * Папка для записи рядом с открытой схемой.
 * Без сервера единственный способ гарантировать «рядом» — выбрать папку один раз.
 */
export const resolveOutputDir = async ({ prompt = false } = {}) => {
  const known = await loadDirHandle();
  if (known && (await ensureWrite(known))) return known;
  if (!prompt || !window.showDirectoryPicker) return null;
  const picked = await window.showDirectoryPicker({ id: 'seditor-schema-dir', mode: 'readwrite' });
  await saveDirHandle(picked);
  return picked;
};

/** Записать файл в папку; null-папка означает «писать некуда». */
export const writeFileToDir = async (dir, filename, contents) => {
  if (!dir) return false;
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
  return true;
};

/** Скачивание — резервный путь для Firefox/Safari без File System Access API. */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
