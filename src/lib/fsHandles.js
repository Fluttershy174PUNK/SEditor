// Browser file handles persist only where IndexedDB and stable secure origins are available.
export const recentHandlePickerAvailable = Boolean(
  typeof indexedDB !== 'undefined' && typeof window !== 'undefined' && window.isSecureContext && typeof crypto?.randomUUID === 'function'
);

const DB = 'seditor-fs';
const STORE = 'handles';
const RECENT_KEY = 'recent-schemas';

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
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

export const listRecentHandles = () => recentHandlePickerAvailable
  ? idb('readonly', (store) => store.get(RECENT_KEY)).then((items) => items || []).catch(() => [])
  : Promise.resolve([]);

export const rememberFileHandle = async (handle) => {
  if (!recentHandlePickerAvailable || typeof handle?.isSameEntry !== 'function') return [];
  try {
    const items = await listRecentHandles();
    const matches = await Promise.all(items.map(async (item) => (await item.handle.isSameEntry(handle).catch(() => false)) ? item : null));
    const entry = matches.find(Boolean) || { id: crypto.randomUUID() };
    entry.name = handle.name;
    entry.handle = handle;
    const recent = [entry, ...items.filter((item) => item.id !== entry.id)].slice(0, 12);
    await idb('readwrite', (store) => store.put(recent, RECENT_KEY));
    return recent;
  } catch {
    return listRecentHandles();
  }
};

export const ensureAccess = async (handle, mode = 'readwrite') => {
  if (!handle) return false;
  const options = { mode };
  if ((await handle.queryPermission?.(options)) === 'granted') return true;
  return (await handle.requestPermission?.(options)) === 'granted';
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
