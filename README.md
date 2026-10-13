# SEditor

A lightweight, single-file editor for flowcharts, architecture maps, and project diagrams. Open `app/editor.html` directly in a browser—no install or server required.

[Русская версия README](README.ru.md) · [Schema format](docs/schema-format.md) · [SEskill](https://github.com/Fluttershy174PUNK/SEskill)

## Open a diagram

Open a paired `.html` launcher beside a schema. The launcher embeds the JSON so it works with `file://` and does not require a server. Regenerate it after editing the JSON:

```bash
cd app
node create-shortcut.mjs ../example_scheme/example-flow.json
```

## Features

- Shapes, labels, tables, zones, levels, and stages
- Connectors with editable labels, routing, and arrow styles
- Multi-select, copy/paste/cut, undo/redo, and shape layer ordering
- 16 muted fill colors; editable labels and descriptions
- JSON and PNG export, grid/snap, pan and zoom
- Russian and English interface

## Optional local server

The dependency-free Node.js backend adds recent files, direct disk writes, and in-editor launcher creation:

```bash
node app/server.js  # http://127.0.0.1:5174/editor.html
```

Keep the default `HOST=127.0.0.1`: the file API can access arbitrary local paths. Without the backend, the editor can still save to a user-selected folder in supported browsers.

## Schema compatibility

Schema v1 remains current. Older unversioned and v1 diagrams open; unsupported future versions are rejected to avoid destructive saves. New saves omit default and geometry-derived fields for compact, readable JSON. See the [schema reference](docs/schema-format.md).

## Development

Requires Node.js 18+.

```bash
npm ci
npm test
npm run build
```

Edit `src/`; `npm run build` creates the self-contained `app/editor.html`. `app/version.json` records the runtime version and checksums.

## License

MIT — see [LICENSE](LICENSE).
