import assert from 'node:assert/strict';
import { deserialize, serialize } from './schema.js';
globalThis.$state = (value) => value;
globalThis.$derived = (value) => value;
const { Board } = await import('./board.svelte.js');

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
assert.equal(board.edges.length, 2);
assert.notEqual(board.edges[1].source, 'n1');
assert.notEqual(board.edges[1].target, 'n2');
board.undo();
assert.equal(board.nodes.length, 2, 'paste is one undo step');

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
