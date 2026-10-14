#!/usr/bin/env node
// Keep runtime checksums in sync after a production build.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'app');
const manifestPath = path.join(app, 'version.json');
try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
  for (const file of Object.keys(manifest.files)) {
    manifest.files[file] = createHash('sha256').update(await readFile(path.join(app, file))).digest('hex');
  }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} catch (error) {
  console.error(`cannot update runtime manifest: ${error.message}`);
  process.exit(1);
}
