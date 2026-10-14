import assert from 'node:assert/strict';
import { deserialize, serialize } from './schema.js';
globalThis.$state = (value) => value;
globalThis.$derived = (value) => value;
const { Board } = await import('./board.svelte.js');
const { handleClipboardShortcut, shouldIgnoreEditorShortcut, shortcutKey } = await import('./editorShortcuts.js');

const old = {
  version: 1,
  meta: { name: 'legacy' },
  nodes: [
    { id: 'n1', type: 'shape', position: { x: 0, y: 0 }, width: 160, height: 80, data: { shape: 'rect', label: '', labelPos: 'inside', desc: '' } },
    { id: 'n2', type: 'shape', position: { x: 20, y: 10 }, width: 96, height: 96, data: { shape: 'circle' } }
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'right', targetHandle: 'left', data: {} }]
};
const legacy = deserialize(old);
assert.equal(legacy.nodes[0].data.label, '');
assert.equal(deserialize({ ...old, version: undefined }).nodes.length, 2, 'unversioned legacy schemas remain readable');
assert.throws(() => deserialize({ ...old, version: 2 }), /Unsupported schema version/);
const normalized = serialize({ name: legacy.name, nodes: legacy.nodes, edges: legacy.edges, viewport: legacy.viewport });
assert.equal(normalized.nodes[0].data.label, undefined, 'defaults omitted from compact JSON');
assert.equal(normalized.nodes[0].data.zones, undefined, 'geometry-derived values omitted');
assert.deepEqual(normalized.edges[0].data, undefined, 'default edge settings omitted');

const filled = deserialize({ ...old, nodes: [{ ...old.nodes[0], data: { shape: 'rect', fill: '#ef4444' } }] });
assert.equal(serialize({ name: '', ...filled }).nodes[0].data.fill, '#ef4444');
const invalidFill = deserialize({ ...old, nodes: [{ ...old.nodes[0], data: { shape: 'rect', fill: 'url(javascript:alert(1))' } }] });
assert.equal(invalidFill.nodes[0].data.fill, undefined, 'untrusted fill is discarded');

const board = new Board();
board.nodes = legacy.nodes;
board.edges = legacy.edges;
board.selectNodes(['n1', 'n2']);
const clip = board.copySelection();
board.pasteSelection(clip);
assert.equal(board.nodes.length, 4);
assert.equal(board.selectedNodes.length, 2, 'paste of multiple selected nodes keeps both copies selected');
assert.equal(new Set(board.selectedNodes).size, 2);
assert.equal(board.edges.length, 2);
assert.notEqual(board.edges[1].source, 'n1');
assert.notEqual(board.edges[1].target, 'n2');
board.undo();
assert.equal(board.nodes.length, 2, 'paste is one undo step');

board.nodes = legacy.nodes;
board.edges = legacy.edges;
board.history.reset();
board.selectNodes(['n1']);
const clipboard = { value: null };
const keyEvent = (key, target = {}) => ({ key, ctrlKey: true, metaKey: false, shiftKey: false, target, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
const copy = keyEvent('c');
assert.equal(handleClipboardShortcut(copy, board, clipboard), true);
assert.equal(copy.prevented && copy.stopped, true);
assert.equal(clipboard.value.nodes.length, 1, 'single selection copies one node');
const paste = keyEvent('v');
handleClipboardShortcut(paste, board, clipboard);
assert.equal(board.nodes.length, 3, 'single node paste happens once');
assert.equal(board.selectedNodes.length, 1);
const cut = keyEvent('x');
handleClipboardShortcut(cut, board, clipboard);
assert.equal(board.nodes.length, 2, 'cut removes its selected node once');
board.undo();
assert.equal(board.nodes.length, 3, 'undo restores cut node');

board.selectNodes(['n1', 'n2']);
handleClipboardShortcut(keyEvent('c'), board, clipboard);
handleClipboardShortcut(keyEvent('v'), board, clipboard);
assert.equal(board.nodes.length, 5, 'multiple selection pastes each copied node once');
assert.equal(board.selectedNodes.length, 2, 'both pasted nodes remain selected');
const historyLength = board.history.past.length;
for (const key of ['c', 'v', 'x', 'z']) {
  for (const [label, event] of [
    ['Ctrl', keyEvent(key, { tagName: 'INPUT' })],
    ['Cmd input', { ...keyEvent(key, { tagName: 'INPUT' }), ctrlKey: false, metaKey: true }],
    ['Cmd', { ...keyEvent(key, { tagName: 'TEXTAREA' }), ctrlKey: false, metaKey: true }],
    ['contenteditable Cmd', { ...keyEvent(key, { isContentEditable: true }), ctrlKey: false, metaKey: true }]
  ]) {
    assert.equal(handleClipboardShortcut(event, board, clipboard), false, `${label}+${key.toUpperCase()} remains native in editable fields`);
    assert.equal(event.prevented, false);
    assert.equal(event.stopped, false);
  }
}
assert.equal(board.history.past.length, historyLength);

board.newSchema();
board.nodes = [legacy.nodes[0]];
board.selectNodes(['n1']);
const metaClipboard = { value: null };
assert.equal(handleClipboardShortcut({ ...keyEvent('c'), ctrlKey: false, metaKey: true }, board, metaClipboard), true, 'macOS Cmd+C is handled');
assert.equal(handleClipboardShortcut({ ...keyEvent('v'), ctrlKey: false, metaKey: true }, board, metaClipboard), true, 'macOS Cmd+V is handled');
assert.equal(board.nodes.length, 2);
assert.equal(handleClipboardShortcut({ ...keyEvent('x'), ctrlKey: false, metaKey: true }, board, metaClipboard), true, 'macOS Cmd+X is handled');
assert.equal(board.nodes.length, 1, 'Cmd+X cuts once');
assert.equal(handleClipboardShortcut({ ...keyEvent('z'), ctrlKey: false, metaKey: true }, board, metaClipboard), true, 'macOS Cmd+Z is handled');
assert.equal(board.nodes.length, 2, 'Cmd+Z undoes cut');

board.nodes = [legacy.nodes[0]];
board.edges = [];
board.selectNodes(['n1']);
const layoutClipboard = { value: null };
const layoutEvent = (key, code) => ({ ...keyEvent(key), code });
assert.equal(handleClipboardShortcut(layoutEvent('ф', 'KeyC'), board, layoutClipboard), true, 'physical KeyC works on a non-English layout');
assert.equal(handleClipboardShortcut(layoutEvent('м', 'KeyV'), board, layoutClipboard), true, 'physical KeyV works on a non-English layout');
assert.equal(board.nodes.length, 2);
assert.equal(handleClipboardShortcut(layoutEvent('ч', 'KeyX'), board, layoutClipboard), true, 'physical KeyX works on a non-English layout');
assert.equal(board.nodes.length, 1);
assert.equal(handleClipboardShortcut(layoutEvent('я', 'KeyZ'), board, layoutClipboard), true, 'physical KeyZ works on a non-English layout');
assert.equal(board.nodes.length, 2, 'non-English layout undo restores cut');
const altGraph = { ...keyEvent('ф'), code: 'KeyC', ctrlKey: true, altKey: false, getModifierState: (name) => name === 'AltGraph' };
assert.equal(handleClipboardShortcut(altGraph, board, layoutClipboard), false, 'AltGraph text input is not intercepted');
assert.equal(altGraph.prevented, false);
assert.equal(altGraph.stopped, false);
assert.equal(shouldIgnoreEditorShortcut(altGraph), true, 'global handler skips reported AltGraph');
for (const key of ['c', 'v', 'x', 'z', 's', 'a', 'd', 'y']) {
  const event = { ...altGraph, key, code: `Key${key.toUpperCase()}` };
  assert.equal(shouldIgnoreEditorShortcut(event), true, `AltGraph+${key.toUpperCase()} never reaches editor shortcuts`);
  assert.equal(shouldIgnoreEditorShortcut({ ...event, altKey: true, getModifierState: () => false }), true, `Ctrl+Alt+${key.toUpperCase()} is ignored even without AltGraph state`);
}
const ctrlAlt = { ...keyEvent('ф'), code: 'KeyC', ctrlKey: true, altKey: true, getModifierState: () => false };
assert.equal(handleClipboardShortcut(ctrlAlt, board, layoutClipboard), false, 'Ctrl+Alt is not treated as a canvas shortcut');
assert.equal(shouldIgnoreEditorShortcut(ctrlAlt), true, 'global shortcut handler skips Ctrl+Alt combinations');
assert.equal(shortcutKey(altGraph), 'c');

board.nodes = [
  { ...legacy.nodes[0], id: 'a', data: { ...legacy.nodes[0].data, shape: 'rect' }, zIndex: 1 },
  { ...legacy.nodes[1], id: 'b', data: { ...legacy.nodes[1].data, shape: 'circle' }, zIndex: 2 },
  { ...legacy.nodes[0], id: 'c', data: { ...legacy.nodes[0].data, shape: 'rect' }, zIndex: 3 }
];
board.edges = [];
board.selectNodes(['b']);
board.moveSelectedShapes(1);
assert.deepEqual(board.nodes.map((n) => n.zIndex), [1, 3, 2], 'shape moves one layer');
const layered = serialize({ name: '', nodes: board.nodes, edges: [], viewport: {} });
assert.deepEqual(deserialize(layered).nodes.map((n) => n.zIndex), [1, 3, 2], 'layer order survives JSON reload');
assert.equal(layered.nodes[0].data.zIndex, undefined, 'layer rank is stored only once');

console.log('schema.test.js: compatibility, palette fills, clipboard, layers passed');
