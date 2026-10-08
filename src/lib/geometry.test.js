// Проверка геометрии: зоны, полосы уровней (горизонтальные линии) и стадий (вертикальные).
// Запуск: node src/lib/geometry.test.js
import assert from 'node:assert/strict';
import {
  applyMembership,
  computeMembership,
  dividerAxis,
  nodeRect,
  nodesBounds,
  rectContains,
  rectsOverlap
} from './geometry.js';
import { clampSize, isDivider, SHAPES, sizeFor, zIndexOf } from './config.js';

const node = (id, shape, x, y, w, h, extra = {}) => ({
  id,
  position: { x, y },
  width: w,
  height: h,
  data: { shape, ...extra }
});

// --- базовые прямоугольники -------------------------------------------------
assert.deepEqual(nodeRect(node('a', 'rect', 10, 20, 100, 50)), { x: 10, y: 20, width: 100, height: 50, x2: 110, y2: 70 });
assert.equal(rectsOverlap(nodeRect(node('a', 'rect', 0, 0, 10, 10)), nodeRect(node('b', 'rect', 9, 9, 10, 10))), true);
assert.equal(rectsOverlap(nodeRect(node('a', 'rect', 0, 0, 10, 10)), nodeRect(node('b', 'rect', 11, 0, 10, 10))), false);
assert.equal(rectContains(nodeRect(node('a', 'rect', 5, 5, 10, 10)), nodeRect(node('b', 'rect', 0, 0, 40, 40))), true);

// --- разделители: формат задаётся конфигом, а не файлом ---------------------
assert.equal(isDivider('level'), true);
assert.equal(isDivider('stage'), true);
assert.equal(isDivider('rect'), false);
assert.equal(SHAPES.level.divider, 'horizontal');
assert.equal(SHAPES.stage.divider, 'vertical');
assert.deepEqual(sizeFor('level'), { width: SHAPES.level.w, height: SHAPES.level.h });
// Растягивание разделителя: свободна только «длина» линии, толщина зажата min=max.
assert.deepEqual(clampSize('level', 900, 900), { width: 400, height: 14 });
assert.deepEqual(clampSize('level', 30, 900), { width: 60, height: 14 });
assert.deepEqual(clampSize('stage', 900, 900), { width: 14, height: 400 });
assert.deepEqual(clampSize('stage', 900, 30), { width: 14, height: 60 });
// Пропорции: квадрат/круг держат 1:1, эллипс и прямоугольник свободные.
assert.deepEqual(clampSize('square', 120, 80), { width: 80, height: 80 }, 'квадрат — сторона одна');
assert.deepEqual(clampSize('circle', 64, 200), { width: 64, height: 64 }, 'круг — сторона одна');
assert.deepEqual(clampSize('ellipse', 200, 96), { width: 200, height: 96 }, 'эллипс не зажимается в квадрат');
assert.deepEqual(clampSize('zone', 640, 240), { width: 640, height: 240 }, 'зона растягивается по обеим осям');
assert.equal(zIndexOf('zone'), -2);
assert.equal(zIndexOf('level'), -1);
assert.equal(zIndexOf('rect'), undefined);

// --- оси разделителей -------------------------------------------------------
const level = node('l1', 'level', -200, 300, 180, 14); // ось y = 307
const stage = node('s1', 'stage', 500, -100, 14, 180); // ось x = 507
assert.equal(dividerAxis(level), 307, 'ось уровня — центр по Y');
assert.equal(dividerAxis(stage), 507, 'ось стадии — центр по X');

// --- зоны -------------------------------------------------------------------
const zone = node('z1', 'zone', 0, 0, 300, 300);
const inside = node('n1', 'rect', 50, 50, 40, 40);
const outside = node('n2', 'rect', 500, 500, 40, 40);
const mz = computeMembership([zone, inside, outside]);
assert.deepEqual(mz.zones.n1, ['z1'], 'объект внутри зоны');
assert.equal(mz.zones.n2, undefined, 'объект вне зоны не входит');
assert.deepEqual(mz.zonesOf.z1, ['n1'], 'зона знает своё содержимое');

// --- уровень: линия именует полосу сверху от себя, снизу от неё — None ------
const above = node('n3', 'rect', 40, 280, 40, 40); // центр 300 < 307 — над линией
const below = node('n4', 'rect', 40, 320, 40, 40); // центр 340 > 307 — под линией
const faraway = node('n5', 'rect', 40, 900, 40, 40);
const onLine = node('n6', 'rect', 40, 287, 40, 40); // центр ровно 307
const ml = computeMembership([level, above, below, faraway, onLine]);
assert.equal(ml.level.n3, 1, 'над линией — полоса уровня (её имя/номер)');
assert.equal(ml.level.n4, null, 'под линией — None до следующего уровня');
assert.equal(ml.level.n5, null, 'далёкий объект — тоже None');
assert.equal(ml.level.n6, null, 'объект на линии — правее (ниже) её');
assert.deepEqual(ml.bands.level.map((b) => b.value), [1, null], 'одна линия → полосы: [имя, None]');

// --- стадия: линия именует полосу слева от себя, справа от неё — None -------
const left = node('n7', 'rect', 480, 40, 40, 40); // центр 500 < 507 — слева от линии
const right = node('n8', 'rect', 520, 40, 40, 40); // центр 540 > 507 — справа от линии
const farRight = node('n9', 'rect', 2000, 40, 40, 40);
const ms = computeMembership([stage, left, right, farRight]);
assert.equal(ms.stage.n7, 1, 'слева от линии — полоса стадии (её имя/номер)');
assert.equal(ms.stage.n8, null, 'справа от линии — None до следующей стадии');
assert.equal(ms.stage.n9, null, 'далёкий объект — тоже None');
assert.deepEqual(ms.bands.stage.map((b) => b.value), [1, null], 'одна линия → полосы: [имя, None]');

// --- имя линии вместо номера ------------------------------------------------
const named = node('ln', 'level', -200, 300, 180, 14, { label: 'Верх' });
const mn = computeMembership([named, above, below]);
assert.equal(mn.level.n3, 'Верх', 'имя линии именует полосу');
assert.equal(mn.level.n4, null, 'второе значение тому же объекту недоступно');
assert.deepEqual(mn.bands.level.map((b) => [b.id, b.value]), [['ln', 'Верх'], [null, null]]);

// --- две линии: полос = линий + 1, каждая — своё значение --------------------
const l2 = node('l2', 'level', -200, 100, 180, 14); // ось y = 107 — первой сверху
const t1 = node('t1', 'rect', 40, 20, 40, 40); // центр 40 → полоса 1 (имя l2)
const t2 = node('t2', 'rect', 40, 180, 40, 40); // центр 200 → полоса 2 (имя l1)
const t3 = node('t3', 'rect', 40, 400, 40, 40); // центр 420 → None
const mt = computeMembership([level, l2, t1, t2, t3]);
assert.equal(mt.level.t1, 1, 'между верхом поля и l2 — полоса l2 (номер 1 по порядку оси)');
assert.equal(mt.level.t2, 2, 'между l2 и l1 — полоса l1 (номер 2)');
assert.equal(mt.level.t3, null, 'под l1 — None');
assert.deepEqual(mt.bands.level.map((b) => b.id), ['l2', 'l1', null]);
// Ровно одно значение на ось — не массивы.
assert.equal(typeof mt.level.t2, 'number', 'значение — скаляр, а не список');

// --- переключение стороны: уровень именует полосу снизу от себя -------------
const flipped = node('lf', 'level', -200, 300, 180, 14, { labelPos: 'bottom' });
const mf = computeMembership([flipped, above, below]);
assert.equal(mf.level.n3, null, 'над линией — None, раз она именует нижнюю полосу');
assert.equal(mf.level.n4, 1, 'под линией — её полоса');
assert.deepEqual(mf.bands.level.map((b) => b.value), [null, 1]);

// --- уровень и стадия независимы: у объекта по одному значению каждой оси ----
const mixed = computeMembership([level, stage, above, below, right, farRight]);
assert.equal(mixed.level.n3, 1, 'above: над уровнем');
assert.equal(mixed.stage.n3, 1, 'above: слева от стадии');
assert.equal(mixed.level.n4, null, 'below: под уровнем — None');
assert.equal(mixed.stage.n4, 1, 'below: значение стадии не зависит от уровня');
assert.equal(mixed.level.n8, 1, 'right: значение уровня не зависит от стадии');
assert.equal(mixed.stage.n8, null, 'right: справа от стадии — None');
assert.equal(mixed.level.n9, 1, 'farRight: полоса уровня — от Y, а не от X');
assert.equal(mixed.stage.n9, null, 'farRight: справа от всех стадий — None');
assert.deepEqual(mixed.objects.map((n) => n.id), ['n3', 'n4', 'n8', 'n9'], 'разделители — не объекты');

// --- разделители и зоны не считаются «объектами» ----------------------------
assert.deepEqual(
  computeMembership([zone, level, stage, inside]).objects.map((n) => n.id),
  ['n1']
);
// Скрытые разделители не делят поле.
assert.equal(computeMembership([{ ...level, hidden: true }, above]).level.n3, null);
assert.equal(computeMembership([{ ...zone, hidden: true }, inside]).zones.n1, undefined);

// --- границы поля для линий -------------------------------------------------
const bounds = nodesBounds([node('a', 'rect', 0, 0, 100, 50), node('b', 'rect', 300, 200, 100, 50), level]);
assert.deepEqual(bounds, { x: 0, y: 0, x2: 400, y2: 250 }, 'разделитель не расширяет границы');
assert.deepEqual(nodesBounds([]), { x: 0, y: 0, x2: 1000, y2: 700 }, 'пустая схема — дефолт');
assert.deepEqual(nodesBounds([level, stage]), { x: 0, y: 0, x2: 1000, y2: 700 }, 'одни разделители — дефолт (иначе линии дёргаются)');

// --- запись взаимосвязей в data (то, что уходит в JSON) ---------------------
const written = applyMembership([zone, level, stage, inside, above]);
const byId = (id) => written.find((n) => n.id === id);
assert.deepEqual(byId('n1').data.zones, ['z1'], 'зоны — список');
assert.equal(byId('n1').data.level, 1, 'над линией — её полоса');
assert.equal(byId('n1').data.stage, 1, 'слева от стадии — её полоса');
assert.equal(byId('n3').data.level, 1, 'над линией — её полоса (ниже — None)');
assert.deepEqual(byId('z1').data.contains, ['n1', 'n3'], 'зона хранит содержимое (оба пересекают её)');
// Сами разделители не получают значений полос.
assert.equal(byId('l1').data.level, undefined);
assert.equal(byId('s1').data.stage, undefined);
assert.equal(byId('s1').data.zones, undefined);
// Значение по умолчанию — None (null в JSON).
const noLines = applyMembership([inside]);
assert.equal(noLines[0].data.level, null, 'без линий — None');
assert.equal(noLines[0].data.stage, null, 'без линий — None');

console.log('geometry.test.js: ok');
