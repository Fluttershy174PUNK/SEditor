// Перегенерация HTML-ярлыка прямо из редактора (режим без сервера).
// Рендер общий с Node-генератором — см. app/launcher.js; здесь только шаблон
// и вычисление относительного пути редактора к папке схемы.
import template from '../../app/shortcut.html?raw';
import { pathSegments, relativePath, renderLauncher, urlPath } from '../../app/launcher.js';

/** Путь редактора относительно папки схемы, если ярлык лежит рядом со схемой. */
export const editorUrlFromSchemaDir = (schemaPathFromAppDir) => {
  // schemaPathFromAppDir — путь вида "../logic-auth-flow.json" (от app/).
  const schemaDir = pathSegments(schemaPathFromAppDir).slice(0, -1);
  const editorInAppDir = ['editor.html'];
  return `${relativePath(schemaDir, editorInAppDir)}`.replace(/^\.\//, '');
};

/**
 * Собрать ярлык для сохранённой схемы.
 * schemaPathFromAppDir — путь схемы относительно app/, editorUrl — путь редактора от ярлыка.
 */
export const buildLauncher = ({ schema, name, schemaPathFromAppDir, editorUrl, editorSha = '' }) => {
  return renderLauncher(template, {
    schema,
    name,
    editorUrl: urlPath(editorUrl),
    // raw: шаблон сам кодирует путь в query
    schemaPathParam: schemaPathFromAppDir,
    editorSha,
    serverCommand: 'node .SEditor/app/server.js'
  });
};
