import { svelte } from '@sveltejs/vite-plugin-svelte';
import { copyFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Build the portable, self-contained SEditor.html at the repository root.
const ROOT = dirname(fileURLToPath(import.meta.url));
const APP = join(ROOT, 'app');

export default defineConfig({
  root: ROOT,
  plugins: [
    svelte({ configFile: join(ROOT, 'svelte.config.js') }),
    {
      name: 'seditor-single-file',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'));
        if (!html) return;

        const js = Object.values(bundle).filter((f) => f.type === 'chunk');
        const css = Object.values(bundle).filter((f) => f.fileName.endsWith('.css'));

        // Внутри <script> последовательность </script> должна быть экранирована.
        let code = js.map((c) => c.code).join('\n').replaceAll('</script', '<\\/script').trimEnd();
        // Preserve the regex's literal space while spelling it as an escape (generated JS otherwise trips diff --check).
        const whitespaceSequence = '[...' + String.fromCharCode(96, 32, 9, 10);
        const whitespaceIndex = code.indexOf(whitespaceSequence);
        if (whitespaceIndex !== -1) {
          code = code.slice(0, whitespaceIndex) + '[...`\\x20\\t\n' + code.slice(whitespaceIndex + whitespaceSequence.length);
        }
        const style = css.map((c) => String(c.source)).join('\n');

        // Strip local Vite references before inserting the bundled app; retain the optional remote font CSS.
        let out = String(html.source)
          .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*>\s*<\/script>\s*/gi, '')
          .replace(/<link\b[^>]*>/gi, (tag) => (/rel="stylesheet"/.test(tag) && !/href="https?:/.test(tag) ? '' : tag));

        // Inject the single-file stylesheet and JavaScript bundle.
        const headAt = out.lastIndexOf('</head>');
        out = out.slice(0, headAt) + (style ? `  <style>${style}</style>\n` : '') + out.slice(headAt);
        const bodyAt = out.lastIndexOf('</body>');
        out = out.slice(0, bodyAt) + `  <script type="module">${code}</script>\n` + out.slice(bodyAt);

        out = out.replace(/[ \t]+(?=\r?\n)/g, '');
        html.source = out.replace(/<!doctype html>/i, '<!doctype html>\n<!-- Generated from src/ — do not edit by hand. -->');

        for (const file of [...js, ...css]) delete bundle[file.fileName];
      },
      async closeBundle() {
        // Vite сохраняет структуру входа: шаблон лежит как app/.build/src/editor.html.
        const built = join(APP, '.build/src/editor.html');
        await rename(built, join(ROOT, 'SEditor.html'));
        await copyFile(join(ROOT, 'SEditor.html'), join(APP, 'editor.html'));
        await rm(join(APP, '.build'), { recursive: true, force: true });
      }
    }
  ],
  publicDir: false,
  build: {
    outDir: join(APP, '.build'),
    emptyOutDir: true,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: 'src/editor.html',
      output: {
        // Всё сводим в один бандл, чтобы склеить его прямо в html.
        codeSplitting: false,
        entryFileNames: 'app.js',
        assetFileNames: 'app[extname]'
      }
    }
  }
});
