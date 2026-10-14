import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Режим разработки: живая перезагрузка через dev-сервер Vite.
// Browser file APIs/downloads work directly; /api is still proxied for backend compatibility.
const svelteConfig = fileURLToPath(new URL('./svelte.config.js', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./src', import.meta.url)),
  plugins: [svelte({ configFile: svelteConfig })],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5174' }
  }
});
