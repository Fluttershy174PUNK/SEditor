// Двуязычный словарь. Один плоский ключ → { ru, en }.
// Язык: localStorage → язык браузера → 'ru'.

export const DICT = {
  appTitle: { ru: 'SEditor', en: 'SEditor' },
  untitled: { ru: 'Без имени', en: 'Untitled' },
  schemaName: { ru: 'Имя схемы', en: 'Schema name' },
  recent: { ru: 'Последние схемы', en: 'Recent schemas' },
  recentEmpty: { ru: 'Схем пока нет', en: 'No schemas yet' },
  noPath: { ru: 'Путь не выбран', en: 'No path yet' },
  open: { ru: 'Открыть', en: 'Open' },
  save: { ru: 'Сохранить', en: 'Save' },
  saveAs: { ru: 'Сохранить как', en: 'Save as' },
  undo: { ru: 'Отменить', en: 'Undo' },
  redo: { ru: 'Вернуть', en: 'Redo' },
  grid: { ru: 'Сетка', en: 'Grid' },
  snap: { ru: 'Привязка к сетке', en: 'Snap to grid' },
  animate: { ru: 'Анимация', en: 'Animation' },
  exportPng: { ru: 'Сохранить PNG', en: 'Save PNG' },
  pngDialog: { ru: 'Сохранить PNG', en: 'Save PNG' },
  fileName: { ru: 'Имя файла', en: 'File name' },
  folder: { ru: 'Папка', en: 'Folder' },
  folderUp: { ru: 'Вверх', en: 'Up' },
  dirEmpty: { ru: 'Папка пуста', en: 'Folder is empty' },
  cancel: { ru: 'Отмена', en: 'Cancel' },
  confirm: { ru: 'Сохранить', en: 'Save' },
  palette: { ru: 'Палитра', en: 'Palette' },
  canvas: { ru: 'Холст', en: 'Canvas' },
  groupShapes: { ru: 'Фигуры', en: 'Shapes' },
  groupSpecial: { ru: 'Особые', en: 'Special' },
  groupLayout: { ru: 'Зоны и уровни', en: 'Zones & levels' },
  props: { ru: 'Свойства', en: 'Properties' },
  nothingSelected: { ru: 'Ничего не выбрано', en: 'Nothing selected' },
  label: { ru: 'Надпись', en: 'Label' },
  dividerName: { ru: 'Название уровня / стадии', en: 'Level / stage name' },
  dividerNameHint: { ru: 'Например: Этап 1', en: 'For example: Stage 1' },
  dividerStyle: { ru: 'Оформление разделителя', en: 'Divider style' },
  labelPos: { ru: 'Положение надписи', en: 'Label position' },
  inside: { ru: 'внутри', en: 'inside' },
  top: { ru: 'сверху', en: 'top' },
  right: { ru: 'справа', en: 'right' },
  bottom: { ru: 'снизу', en: 'bottom' },
  desc: { ru: 'Описание', en: 'Description' },
  descHint: { ru: 'Хранится в файле, не отображается', en: 'Stored in file, not rendered' },
  posX: { ru: 'X', en: 'X' },
  posY: { ru: 'Y', en: 'Y' },
  width: { ru: 'Ширина', en: 'Width' },
  height: { ru: 'Высота', en: 'Height' },
  links: { ru: 'Взаимосвязи', en: 'Connections' },
  noLinks: { ru: 'Нет связей', en: 'No connections' },
  delete: { ru: 'Удалить', en: 'Delete' },
  removeLink: { ru: 'Удалить связь', en: 'Remove connection' },
  reverse: { ru: 'Развернуть', en: 'Reverse' },
  shape: { ru: 'Фигура', en: 'Shape' },
  cols: { ru: 'Колонок', en: 'Columns' },
  rows: { ru: 'Строк', en: 'Rows' },
  header: { ru: 'Строка заголовка', en: 'Header row' },
  border: { ru: 'Рамка', en: 'Border' },
  solid: { ru: 'сплошная', en: 'solid' },
  dashed: { ru: 'пунктир', en: 'dashed' },
  dotted: { ru: 'точки', en: 'dotted' },
  stroke: { ru: 'Цвет линии', en: 'Line color' },
  fill: { ru: 'Заливка', en: 'Fill' },
  edgeProps: { ru: 'Свойства связи', en: 'Edge properties' },
  edgeLabel: { ru: 'Надпись связи', en: 'Edge label' },
  edgeStyle: { ru: 'Стиль', en: 'Style' },
  straight: { ru: 'прямая', en: 'straight' },
  step: { ru: 'ступень', en: 'step' },
  smoothstep: { ru: 'сглаженная', en: 'smoothstep' },
  lineDash: { ru: 'Тип линии', en: 'Line type' },
  marker: { ru: 'Метка', en: 'Marker' },
  none: { ru: 'нет', en: 'none' },
  arrow: { ru: 'стрелка', en: 'arrow' },
  triangle: { ru: 'треугольник', en: 'triangle' },
  circle: { ru: 'круг', en: 'circle' },
  direction: { ru: 'Направление', en: 'Direction' },
  end: { ru: 'вперёд', en: 'forward' },
  start: { ru: 'назад', en: 'backward' },
  both: { ru: 'оба', en: 'both' },
  membership: { ru: 'Размещение', en: 'Membership' },
  belongsTo: { ru: 'входит в', en: 'inside' },
  saved: { ru: 'Сохранено', en: 'Saved' },
  saveAsBrowserHint: {
    ru: 'Браузер не умеет выбирать папку — файл ушёл в загрузки. Включите «Всегда спрашивать, куда сохранять» в настройках браузера.',
    en: "This browser can't pick a folder — the file went to Downloads. Enable “Always ask where to save files” in the browser settings."
  },
  loaded: { ru: 'Загружено', en: 'Loaded' },
  error: { ru: 'Ошибка', en: 'Error' },
  pngFolder: { ru: 'Папка (абсолютный путь или от корня проекта)', en: 'Folder (absolute or from project root)' },
  filePermissionDenied: { ru: 'Нет разрешения на запись в папку', en: 'Write permission for the folder was denied' },
  offlineHint: {
    ru: 'Ярлык открывает схему сразу. Сохранение на диск требует сервера: node .SEditor/app/server.js',
    en: 'The launcher opens the schema directly. Saving to disk needs the server: node .SEditor/app/server.js'
  },
  offlineSaveHint: {
    ru: 'Без сервера файл ушёл в загрузки. Чтобы писать рядом со схемой, запустите node .SEditor/app/server.js',
    en: 'Without the server the file went to Downloads. To write next to the schema run node .SEditor/app/server.js'
  },
  shortcutWritten: { ru: 'Ярлык обновлён', en: 'Launcher updated' },
  languages: { ru: 'Язык', en: 'Language' },
  zoomIn: { ru: 'Приблизить', en: 'Zoom in' },
  zoomOut: { ru: 'Отдалить', en: 'Zoom out' },
  fit: { ru: 'Показать всё', en: 'Fit view' },
  added: { ru: 'Добавлено', en: 'Added' },
  clickOrDrag: { ru: 'клик или перетащите на поле', en: 'click or drag onto the canvas' },
  emptyCanvasHint: {
    ru: 'Выберите фигуру в палитре справа — она появится здесь',
    en: 'Pick a shape in the palette on the right — it will appear here'
  },
  selectAll: { ru: 'Выделить всё', en: 'Select all' },
  shortcutsHint: {
    ru: 'Ctrl+Z / Ctrl+Shift+Z — отмена и возврат · Ctrl+A — выделить всё · Ctrl+D — дублировать · Delete — удалить · стрелки — сдвиг · Esc — снять выделение · Ctrl+S — сохранить',
    en: 'Ctrl+Z / Ctrl+Shift+Z — undo and redo · Ctrl+A — select all · Ctrl+D — duplicate · Delete — remove · arrows — nudge · Esc — deselect · Ctrl+S — save'
  },
  duplicate: { ru: 'Дублировать', en: 'Duplicate' },
  // Названия фигур (для подсказок палитры).
  square: { ru: 'квадрат', en: 'square' },
  rect: { ru: 'прямоугольник', en: 'rectangle' },
  ellipse: { ru: 'эллипс', en: 'ellipse' },
  diamond: { ru: 'ромб', en: 'diamond' },
  hexagon: { ru: 'гексагон', en: 'hexagon' },
  table: { ru: 'таблица', en: 'table' },
  zone: { ru: 'зона', en: 'zone' },
  level: { ru: 'уровень', en: 'level' },
  stage: { ru: 'стадия', en: 'stage' },
  above: { ru: 'выше', en: 'above' },
  below: { ru: 'ниже', en: 'below' },
  left: { ru: 'слева', en: 'left' },
  on: { ru: 'на линии', en: 'on the line' },
  contains: { ru: 'содержит', en: 'contains' },
  dividerHint: {
    ru: 'Линия тянется через всё поле, двигается только по своей оси',
    en: 'The line spans the whole field and moves along its axis only'
  }
};

let lang = $state('ru');

const detect = () => {
  try {
    const stored = localStorage.getItem('seditor.lang');
    if (stored === 'ru' || stored === 'en') return stored;
  } catch {}
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return nav.toLowerCase().startsWith('ru') ? 'ru' : 'en';
};

lang = detect();

export const i18n = {
  get lang() {
    return lang;
  },
  set lang(value) {
    lang = value === 'en' ? 'en' : 'ru';
    try {
      localStorage.setItem('seditor.lang', lang);
    } catch {}
  },
  get other() {
    return lang === 'ru' ? 'en' : 'ru';
  },
  toggle() {
    i18n.lang = i18n.other;
  },
  /** t('open') → строка на текущем языке */
  t(key) {
    const entry = DICT[key];
    if (!entry) return key;
    return entry[lang] ?? entry.ru ?? key;
  }
};

export const t = (key) => i18n.t(key);
