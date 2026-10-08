# SEditor

Лёгкий редактор логических схем и блоков. Одна HTML-страница, ноль рантайм-зависимостей
(всё уже внутри `app/editor.html`), дизайн — пиксельное ретро в духе NES.css.

## Запустить

Скачать и открыть одной строкой — без установки и зависимостей:

```bash
curl -fsSLO https://raw.githubusercontent.com/<user>/<repo>/main/app/editor.html && xdg-open editor.html
```

> `xdg-open`/`open` — Linux/macOS; на Windows откройте скачанный файл двойным кликом.

Полный режим (список последних схем, сохранение схем и PNG на диск):

```bash
git clone <repo-url> seditor && cd seditor && npm i && npm start   # → http://localhost:5174/editor.html
```

Папка `app/` автономна: скопируйте её куда угодно и запустите `node server.js` — работает
как есть, без установки зависимостей.

## Что умеет

**Холст.** Фигуры (квадрат, прямоугольник, круг, эллипс, ромб, гексагон, треугольник),
надпись, таблица, зона, уровень, стадия. Связи тянутся с любой из 4 граней, у каждой связи —
надпись, стиль, тип и направление линии. Зоны, уровни и стадии при сохранении записываются
в JSON как взаимосвязи объекта (`zones`, `levels`, `stages`).

**Верхний бар.** Имя схемы (оно же имя json-файла), список последних схем, путь к файлу,
открыть / сохранить / сохранить как, undo / redo, сетка и привязка к сетке, экспорт PNG, язык РУ/АНГЛ.

**Правая панель.** Палитра фигур и настройки выделенного: надпись и её положение, описание,
X / Y, ширина и высота, параметры таблицы, стиль зоны, цвет уровня и стадии, список связей.

**Горячие клавиши.** `Ctrl/Cmd+Z` отмена · `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` возврат ·
`Ctrl/Cmd+A` выделить всё · `Ctrl/Cmd+D` дублировать · `Ctrl/Cmd+S` сохранить ·
`Delete` / `Backspace` удалить · стрелки — сдвиг на 1 (`Shift` — на 10) · `Esc` снять выделение.

## Два режима

| | `file://` (двойной клик) | `npm start` (backend) |
|---|---|---|
| Редактирование, связи, PNG (скачивание) | ✅ | ✅ |
| Открыть / сохранить схему на диск | по пути из диалога | ✅ |
| Список последних схем | ❌ | ✅ |
| Сохранить PNG на диск | ❌ | ✅ |

`app/editor.html` самодостаточен: CSS и JS внутри, внешне тянется только пиксельный шрифт
с Google Fonts (без сети — системный моноширинный).

## Разработка

```bash
npm i
npm run dev     # Vite на :5173 с живой перезагрузкой и прокси /api
npm start       # в другом терминале — backend на :5174
npm run build   # собирает src/ в один app/editor.html
npm test        # проверка взаимосвязей зон, уровней и стадий
```

Порт backend меняется переменной `PORT`, хост — `HOST` (по умолчанию `127.0.0.1`;
файловый API пишет по любым путям диска, поэтому `HOST=0.0.0.0` — только на доверенной машине).

## Структура

```
app/            — сам редактор и файлы функционала
  editor.html   — ИСПОЛНЯЕМАЯ СТРАНИЦА: собранный из src/ один файл, готов к копированию
  server.js     — статика + файловый API без зависимостей (node:http / node:fs)
  vite.config.js   — сборка src/ в один editor.html
  dev.config.js    — dev-сервер с живой перезагрузкой
  svelte.config.js — настройки компилятора Svelte 5
src/            — исходники; собирается в app/editor.html
  editor.html   — шаблон страницы
  main.js       — монтирование корня
  styles/theme.css
  lib/          — config, geometry (+ тест), schema, board, history, i18n, icons, exportPng, api
  components/   — Editor, TopBar, FlowCanvas, Palette, Inspector, BottomBar, диалоги,
                  EdgePath / EdgeFields, nodes/ShapeNode, nodes/DividerNode, PixelIcon
example_scheme/ — примеры схем (появляются в списке последних)
package.json    — скрипты и dev-зависимости (svelte, vite, @xyflow/svelte)
README.md       — этот файл
```

В корне — только `app/`, `src/`, `example_scheme/`, `README.md` и файлы git.
`app/editor.html` уже собран и лежит в git, так что склонированный репозиторий работает сразу.

## Файловый API

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/schemas` | список схем в `app/` и `example_scheme/` (по времени) |
| GET | `/api/fs?path=` | листинг любой директории для диалога файла |
| GET | `/api/schema?path=` | чтение схемы |
| POST | `/api/schema` | запись схемы `{ path, data }` |
| POST | `/api/png` | сохранение PNG `{ path, dataUrl }` |

Статика отдаётся только из `app/`; файловый API работает с любым путём диска.
Размер тела ограничен 64 МБ.

## Формат схемы

```json
{
  "version": 1,
  "meta": { "name": "схема", "app": "SEditor", "updated": "..." },
  "nodes": [{ "id": "n1", "type": "shape", "position": { "x": 0, "y": 0 }, "width": 160, "height": 80,
              "data": { "shape": "rect", "label": "Начало", "labelPos": "inside", "desc": "",
                        "zones": ["z1"], "levels": [{ "id": "l1", "side": "above" }],
                        "stages": [{ "id": "s1", "side": "left" }] } }],
  "edges": [{ "id": "e1", "source": "n1", "target": "n2", "sourceHandle": "right", "targetHandle": "left",
              "type": "straight", "data": { "label": "да", "dash": "solid", "marker": "arrow", "arrow": "end" } }],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

`data.shape`: `square`, `rect`, `circle`, `ellipse`, `diamond`, `hexagon`, `triangle`,
`label`, `table`, `zone`, `level`, `stage`. `sourceHandle` / `targetHandle`: `top`, `right`,
`bottom`, `left`.
