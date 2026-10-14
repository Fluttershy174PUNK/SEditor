# SEditor

A lightweight, portable HTML editor for flowcharts, architecture maps, and project diagrams. Open `SEditor.html` directly in a browser—no installation or server required.

[Русская версия README](README.ru.md) · [Schema format](docs/schema-format.md) · [SEskill](https://github.com/Fluttershy174PUNK/SEskill)

## Open and share a diagram

Open JSON with the editor's **Open** button, or drop a JSON file onto the page. The **HTML** button downloads a portable, self-contained editor copy with the current diagram embedded. Move or share that file; it opens without a server.

## Features

- Shapes, labels, tables, zones, levels, and stages
- Connectors with editable labels, routing, and arrow styles
- Multi-select; `Ctrl/Cmd+C/V/X/Z` to copy, paste, cut, and undo one or multiple selected nodes
- 16 muted fill colors; editable labels and descriptions
- JSON and PNG export, grid/snap, pan and zoom
- Russian and English interface

## Files and privacy

Open JSON with the browser picker. In supported Chromium browsers, the editor can save directly to a chosen file and offer recents when the browser permits storing file handles. File permissions are controlled by the browser. Other browsers use downloads. File access and recents may be limited in standalone exported HTML or some browsers. No server is required for normal use.

## Schema compatibility

Schema v1 remains current. Older unversioned and v1 diagrams open; unsupported future versions are rejected to avoid destructive saves. New saves omit default and geometry-derived fields for compact, readable JSON. See the [schema reference](docs/schema-format.md).

## Development

Node.js 18+ is required only for building and tests; users need a browser.

```bash
npm ci
npm run build
npm test
```

Edit `src/`; the build generates root `SEditor.html` and its byte-identical `app/editor.html` compatibility copy. `app/version.json` records the managed runtime checksums.

## License

MIT — see [LICENSE](LICENSE).
