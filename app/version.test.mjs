#!/usr/bin/env node
// Verify app release manifest checksums and launcher contract.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(app, '..');
let manifest;
try { manifest = JSON.parse(await readFile(path.join(app, 'version.json'), 'utf8')); } catch (error) {
  console.error(`invalid app/version.json: ${error.message}`);
  process.exit(1);
}
assert.equal(manifest.name, 'SEditor');
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.launcherFormat, 'embed-v1');
for (const [file, expected] of Object.entries(manifest.files)) {
  const actual = createHash('sha256').update(await readFile(path.join(app, file))).digest('hex');
  assert.equal(actual, expected, `version.json checksum mismatch for ${file}`);
}
assert.equal(manifest.version, '0.8.0');
const standalone = await readFile(path.join(root, 'SEditor.html'), 'utf8');
assert.match(standalone, /window\.__SEDITOR_INITIAL_SCHEMA__/);
assert.match(standalone, /window\.__SEDITOR_TEMPLATE_HTML__/);
assert.match(standalone, /seditor-schema/);
assert.doesNotMatch(standalone, /<script\b[^>]*\bsrc=/i, 'standalone page must not require external JavaScript');
assert.match(standalone, /fonts\.googleapis\.com/);
assert.match(standalone, /fonts\.gstatic\.com/);
const module = standalone.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(module, 'one bundled module script expected');
new Function(module);
assert.ok((standalone.match(/<script type="module">/g) || []).length >= 1, 'bundled module script must exist');
assert.deepEqual(await readFile(path.join(root, 'SEditor.html')), await readFile(path.join(app, 'editor.html')));
for (const file of ['server.js', 'launcher.js']) {
  const actual = createHash('sha256').update(await readFile(path.join(app, file))).digest('hex');
  assert.equal(actual, manifest.files[file], `${file} checksum in runtime manifest`);
}
console.log(`version.test.mjs: ${Object.keys(manifest.files).length} runtime checksums and standalone HTML verified`);
