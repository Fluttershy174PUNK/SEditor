// SEditor entry: только монтирование корня. Вся логика — в components/ и lib/.
import { mount } from 'svelte';
import './styles/theme.css';
import Editor from './components/Editor.svelte';

mount(Editor, { target: document.getElementById('app') });
