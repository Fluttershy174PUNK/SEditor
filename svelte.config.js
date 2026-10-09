export default {
  compilerOptions: {
    runes: true,
    // По умолчанию svelte хеширует scoped-классы от АБСОЛЮТНОГО пути файла:
    // сборка из другой директории даёт другой app/editor.html и расхождение
    // контрольных сумм в version.json. Хешируем содержимое CSS — артефакт
    // воспроизводим из любого места.
    cssHash: ({ css, hash }) => `svelte-${hash(css)}`
  }
};
