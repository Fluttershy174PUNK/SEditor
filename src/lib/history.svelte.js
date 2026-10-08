// Undo/redo на снимках {nodes, edges}. Максимум MAX_HISTORY шагов.
import { MAX_HISTORY } from './config.js';

// Снимки должны быть обычными объектами: $state-прокси structuredClone не клонирует,
// поэтому идём через JSON (данные узлов всё равно JSON-совместимые).
export const clone = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

export class History {
  past = $state([]);
  future = $state([]);
  limit;

  constructor(limit = MAX_HISTORY) {
    this.limit = limit;
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  /** Сброс истории при загрузке/новой схеме. */
  reset() {
    this.past = [];
    this.future = [];
  }

  /** Запомнить состояние ПЕРЕД изменением. */
  push(snapshot) {
    this.past = [...this.past.slice(-(this.limit - 1)), clone(snapshot)];
    this.future = [];
  }

  /** @returns предыдущее состояние или null */
  undo(current) {
    if (!this.past.length) return null;
    const previous = this.past[this.past.length - 1];
    this.past = this.past.slice(0, -1);
    this.future = [clone(current), ...this.future];
    return previous;
  }

  /** @returns следующее состояние или null */
  redo(current) {
    if (!this.future.length) return null;
    const next = this.future[0];
    this.future = this.future.slice(1);
    this.past = [...this.past, clone(current)];
    return next;
  }
}
