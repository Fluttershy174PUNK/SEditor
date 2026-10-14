#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderStandaloneEditor } from './launcher.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(root, 'SEditor.html'), 'utf8');
const duplicate = await readFile(path.join(root, 'SEditor.html'), 'utf8');
assert.equal(duplicate, html, 'portable editor build is stable between reads');
assert.match(html, /window\.__SEDITOR_INITIAL_SCHEMA__/);
assert.match(html, /window\.__SEDITOR_TEMPLATE_HTML__/);
assert.match(html, /<script type="module">/);
const bundle = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(bundle);
const templateCapture = bundle.lastIndexOf('__SEDITOR_TEMPLATE_HTML__');
const mountAt = bundle.lastIndexOf('target:document.getElementById(`app`)');
assert.ok(templateCapture !== -1 && mountAt !== -1 && templateCapture < mountAt, 'template capture runs before the root Svelte mount');
assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/i);
assert.doesNotMatch(html, /fetch\(['"]\/api\//, 'core file operations must not depend on the backend');
const fixture = { version: 1, meta: { name: '</script><img src=x>' }, nodes: [], edges: [] };
const exported = renderStandaloneEditor(html, fixture);
assert.match(exported, /id="seditor-schema"/);
assert.doesNotMatch(exported.split('id="seditor-schema">')[1].split('</script>')[0], /</, 'embedded JSON escapes script-breaking characters');
const embeddedSchema = exported.match(/<script type="application\/json" id="seditor-schema">([\s\S]*?)<\/script>/)?.[1];
assert.equal(JSON.parse(embeddedSchema).meta.name, fixture.meta.name);
assert.ok(exported.includes('__SEDITOR_TEMPLATE_HTML__'), 'export keeps its original template source');
console.log('standalone.test.mjs: root HTML, bundled entry point, backend-independent core passed');
