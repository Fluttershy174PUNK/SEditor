// SEditor entry: только монтирование корня. Вся логика — в components/ и lib/.
import { mount } from 'svelte';
import './styles/theme.css';
import Editor from './components/Editor.svelte';

export const captureStandaloneTemplate = (documentRef = document) => {
  const template = documentRef.documentElement.cloneNode(true);
  template.querySelectorAll('#seditor-schema, #seditor-bootstrap').forEach((element) => element.remove());
  return `${documentRef.doctype ? `<!doctype ${documentRef.doctype.name}>` : '<!doctype html>'}\n${template.outerHTML}`;
};

if (typeof window !== 'undefined' && !window.__SEDITOR_TEMPLATE_HTML__) window.__SEDITOR_TEMPLATE_HTML__ = captureStandaloneTemplate();

mount(Editor, {
  target: document.getElementById('app'),
  props: { initialSchema: window.__SEDITOR_INITIAL_SCHEMA__ ?? null }
});
