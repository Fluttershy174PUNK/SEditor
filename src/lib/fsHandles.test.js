import assert from 'node:assert/strict';

globalThis.window = { isSecureContext: false };
const { recentHandlePickerAvailable, listRecentHandles, rememberFileHandle, downloadBlob, ensureAccess } = await import('./fsHandles.js');
assert.equal(recentHandlePickerAvailable, false, 'opaque or insecure origins disable recent-handle persistence');
assert.deepEqual(await listRecentHandles(), []);
assert.deepEqual(await rememberFileHandle({ name: 'local.json' }), []);
assert.equal(await ensureAccess(null), false);
const clicked = [];
globalThis.URL.createObjectURL = () => 'blob:test';
globalThis.URL.revokeObjectURL = () => {};
globalThis.document = { createElement: () => ({ click: () => clicked.push(true) }) };
downloadBlob(new Blob(['schema']), 'schema.json');
assert.deepEqual(clicked, [true], 'fallback triggers a browser download');
console.log('fsHandles.test.js: capability fallback and browser download passed');
