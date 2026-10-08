// Клиент файлового API (app/server.js). Всё асинхронное, ошибки — исключения с текстом.
const req = async (url, options) => {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
};

/** Список схем рядом с editor + папки, в которые можно писать. */
export const listSchemas = () => req('/api/schemas');

/** Листинг любой директории диска (пустой путь — корень проекта). */
export const listDir = (path) => req(`/api/fs?path=${encodeURIComponent(path || '')}`);

/** Чтение схемы по относительному пути. */
export const readSchema = (path) => req(`/api/schema?path=${encodeURIComponent(path)}`);

/** Запись схемы (формат SEditor v1 — см. src/lib/schema.js). */
export const writeSchema = (path, data) =>
  req('/api/schema', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, data })
  });

/** Сохранение PNG (dataUrl) на диск. */
export const writePng = (path, dataUrl) =>
  req('/api/png', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, dataUrl })
  });
