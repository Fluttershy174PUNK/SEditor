// Optional legacy local-backend client; the standalone editor does not call these endpoints.
const req = async (url, options) => {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
};

export const listSchemas = () => req('/api/schemas');
export const listDir = (path) => req(`/api/fs?path=${encodeURIComponent(path || '')}`);
export const readSchema = (path) => req(`/api/schema?path=${encodeURIComponent(path)}`);
export const writeSchema = (path, data) => req('/api/schema', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path, data })
});
export const createShortcut = (path) => req('/api/shortcut', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path })
});
export const writePng = (path, dataUrl) => req('/api/png', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path, dataUrl })
});
