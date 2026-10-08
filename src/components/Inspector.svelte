<script>
  // Правая панель: свойства выбранного элемента или связи + окно взаимосвязей.
  import {
    BORDER_STYLES,
    LABEL_POSITIONS,
    LINE_DASHES,
    SHAPES,
    isDivider
  } from '../lib/config.js';
  import { board } from '../lib/board.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import EdgeFields from './EdgeFields.svelte';
  import PixelIcon from './PixelIcon.svelte';

  const node = $derived(board.selectedNode);
  const edge = $derived(board.selectedEdge);
  const data = $derived(node?.data || {});
  const shape = $derived(data.shape);
  const spec = $derived(SHAPES[shape] || SHAPES.rect);
  const isZone = $derived(shape === 'zone');
  const divider = $derived(isDivider(shape));
  const horizontal = $derived(divider ? SHAPES[shape].divider === 'horizontal' : false);

  // Связи выбранного элемента: исходящие, входящие и двусторонние.
  const links = $derived(
    !node
      ? []
      : board.edges
          .filter((e) => e.source === node.id || e.target === node.id)
          .map((e) => ({
            id: e.id,
            out: e.source === node.id,
            incoming: e.target === node.id,
            label: e.data?.label || '',
            other: board.labelOf(e.source === node.id ? e.target : e.source) || '—'
          }))
  );

  const membership = $derived(board.membership);
  const zones = $derived(node ? membership.zones[node.id] || [] : []);
  // Ровно одно значение каждой оси: None — вне линий.
  const level = $derived(node ? membership.level[node.id] ?? null : null);
  const stage = $derived(node ? membership.stage[node.id] ?? null : null);
  const zonesOf = $derived(node && isZone ? membership.zonesOf[node.id] || [] : []);
  // У разделителя показываем его полосу (то, что он именует) и её содержимое.
  const band = $derived(
    node && divider
      ? (horizontal ? membership.bands.level : membership.bands.stage).find((b) => b.id === node.id)
      : null
  );
  const nameOf = (id) => board.labelOf(id) || id.slice(-4);
  // Сторона подписи разделителя: подпись именует полосу своей стороны —
  // уровень сверху (дефолт), стадия слева (дефолт); «снизу/справа» — переключение.
  const dividerLabelPos = $derived(
    horizontal ? (data.labelPos === 'bottom' ? 'bottom' : 'top') : data.labelPos === 'right' ? 'right' : 'left'
  );

  // coalesce: набор текста в одном поле — один шаг undo.
  const setData = (patch) => board.editNode(node.id, { data: patch }, { coalesce: true });

  const setNumber = (key, value) => {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num)) return;
    if (key === 'x' || key === 'y') {
      board.editNode(node.id, { position: { ...node.position, [key]: num } });
      board.syncExtent();
    } else if (spec.sizeLocked) {
      // Квадрат/круг: сторона одна — меняем оба размера сразу.
      board.resizeNode(node.id, num, num);
    } else {
      board.resizeNode(node.id, key === 'width' ? num : node.width, key === 'height' ? num : node.height);
    }
  };

  const linkLabels = $derived({
    bidir: '←→',
    out: '→',
    in: '←'
  });
</script>

<aside class="inspector" aria-label={t('props')}>
  <h2>{t('props')}</h2>

  {#if edge}
    <div class="group">
      <EdgeFields id={edge.id} />
      <div class="row">
        <button onclick={() => board.reverseEdge(edge.id)}>{t('reverse')}</button>
        <button class="danger" onclick={() => board.deleteEdge(edge.id)}><PixelIcon name="minus" size={12} />{t('delete')}</button>
      </div>
    </div>
  {:else if node}
    <div class="group">
      <div class="head">
        <PixelIcon name={spec.icon} size={14} />
        <span>{t(shape)}</span>
      </div>

      <label for="node-label">{divider ? t('dividerName') : t('label')}</label>
      <input id="node-label" value={data.label || ''} placeholder={divider ? t('dividerNameHint') : ''} oninput={(e) => setData({ label: e.target.value })} />

      {#if divider}
        <!-- Подпись именует пространство: уровень — сверху/снизу, стадия — справа/слева. -->
        <label for="node-label-pos">{t('labelPos')}</label>
        <select id="node-label-pos" value={dividerLabelPos} onchange={(e) => setData({ labelPos: e.target.value })}>
          {#each horizontal ? ['top', 'bottom'] : ['left', 'right'] as p (p)}<option value={p}>{t(p)}</option>{/each}
        </select>
      {:else}
        <label for="node-label-pos">{t('labelPos')}</label>
        <select id="node-label-pos" value={data.labelPos || 'inside'} onchange={(e) => setData({ labelPos: e.target.value })}>
          {#each LABEL_POSITIONS as p (p)}<option value={p}>{t(p)}</option>{/each}
        </select>
      {/if}

      <label for="node-desc">{t('desc')}</label>
      <textarea id="node-desc" rows="2" value={data.desc || ''} oninput={(e) => setData({ desc: e.target.value })}></textarea>
      <p class="hint">{t('descHint')}</p>

      <fieldset>
        <legend>{t('posX')}/{t('posY')}</legend>
        <div class="row">
          <label class="mini">X<input type="number" value={Math.round(node.position.x)} onchange={(e) => setNumber('x', e.target.value)} /></label>
          <label class="mini">Y<input type="number" value={Math.round(node.position.y)} onchange={(e) => setNumber('y', e.target.value)} /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{divider ? (horizontal ? t('width') : t('height')) : `${t('width')}/${t('height')}`}</legend>
        <div class="row">
          {#if !divider || horizontal}
            <label class="mini">W<input type="number" value={Math.round(node.width ?? spec.w)} onchange={(e) => setNumber('width', e.target.value)} /></label>
          {/if}
          {#if !divider || !horizontal}
            <label class="mini">H<input type="number" value={Math.round(node.height ?? spec.h)} onchange={(e) => setNumber('height', e.target.value)} /></label>
          {/if}
        </div>
      </fieldset>
    </div>

    {#if shape === 'table'}
      <div class="group">
        <h3>{t('table')}</h3>
        <label for="t-cols">{t('cols')}</label>
        <input id="t-cols" type="number" min="1" max="50" value={data.cols ?? 3} onchange={(e) => board.editTable(node.id, { cols: Number(e.target.value) })} />
        <label for="t-rows">{t('rows')}</label>
        <input id="t-rows" type="number" min="1" max="200" value={data.rows ?? 3} onchange={(e) => board.editTable(node.id, { rows: Number(e.target.value) })} />
        <label class="check">
          <input type="checkbox" checked={data.header !== false} onchange={(e) => board.editTable(node.id, { header: e.target.checked })} />
          {t('header')}
        </label>
      </div>
    {/if}

    {#if shape === 'zone'}
      <div class="group">
        <h3>{t('zone')}</h3>
        <label for="z-border">{t('border')}</label>
        <select id="z-border" value={data.border || 'dashed'} onchange={(e) => setData({ border: e.target.value })}>
          {#each BORDER_STYLES as b (b)}<option value={b}>{t(b)}</option>{/each}
        </select>
        <label for="z-stroke">{t('stroke')}</label>
        <input id="z-stroke" type="color" value={data.stroke || '#5c6b7a'} onchange={(e) => setData({ stroke: e.target.value })} />
        <label for="z-fill">{t('fill')}</label>
        <input id="z-fill" type="color" value={data.fill || '#0e1720'} onchange={(e) => setData({ fill: e.target.value })} />
      </div>
    {/if}

    {#if divider}
      <div class="group">
        <h3>{t('dividerStyle')}</h3>
        <label for="d-stroke">{t('stroke')}</label>
        <input id="d-stroke" type="color" value={data.stroke || '#7c8b9a'} onchange={(e) => setData({ stroke: e.target.value })} />
        <label for="d-dash">{t('lineDash')}</label>
        <select id="d-dash" value={data.dash || 'dashed'} onchange={(e) => setData({ dash: e.target.value })}>
          {#each LINE_DASHES as s (s)}<option value={s}>{t(s)}</option>{/each}
        </select>
        <p class="hint">{t('dividerHint')}</p>
      </div>
    {/if}

    <div class="group">
      <h3>{t('links')}</h3>      {#if links.length}
        <ul class="links">
          {#each links as l (l.id)}
            <li>
              <span class="dir" title={t('direction')}>{l.out && l.incoming ? linkLabels.bidir : l.out ? linkLabels.out : linkLabels.in}</span>
              <span class="who">{l.other}</span>
              {#if l.label}<span class="tag">{l.label}</span>{/if}
              <button
                class="mini danger"
                title={t('removeLink')}
                aria-label={t('removeLink')}
                onclick={() => board.deleteEdge(l.id)}
              >×</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="hint">{t('noLinks')}</p>
      {/if}
    </div>

    {#if isZone || zones.length || level || stage || band}
      <div class="group">
        <h3>{t('membership')}</h3>
        <ul class="links">
          {#each zones as z (z)}
            <li><span class="dir">◻</span><span class="who">{nameOf(z)}</span><span class="tag">{t('belongsTo')}</span></li>
          {/each}
          {#if level}
            <li><span class="dir">↕</span><span class="who">{t('level')}: {level}</span></li>
          {/if}
          {#if stage}
            <li><span class="dir">↔</span><span class="who">{t('stage')}: {stage}</span></li>
          {/if}
          {#each zonesOf as z (z)}
            <li><span class="dir">◻</span><span class="who">{nameOf(z)}</span><span class="tag">{t('contains')}</span></li>
          {/each}
          {#if band}
            {#each band.objects as o (o)}
              <li><span class="dir">·</span><span class="who">{nameOf(o)}</span><span class="tag">{t('contains')}</span></li>
            {/each}
          {/if}
        </ul>
      </div>
    {/if}
  {:else}
    <p class="hint">{t('nothingSelected')}</p>
  {/if}
</aside>

<style>
  .inspector {
    width: 100%;
    overflow-y: auto;
    background: var(--panel);
    padding: 6px;
  }

  h2 {
    margin: 0 0 6px;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--accent);
    letter-spacing: 0.08em;
  }

  h3 {
    margin: 0 0 4px;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--ink-dim);
    letter-spacing: 0.08em;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    margin-bottom: 6px;
    background: var(--panel-2);
    border: 2px solid var(--line);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--accent-2);
    text-transform: uppercase;
    font-family: var(--font-pixel);
    font-size: 9px;
    margin-bottom: 2px;
  }

  .row {
    display: flex;
    gap: 4px;
  }

  .row > * {
    flex: 1 1 0;
    min-width: 0;
  }

  fieldset {
    border: 1px solid var(--line);
    margin: 0;
    padding: 4px;
  }

  legend {
    color: var(--ink-dim);
    font-size: 10px;
    padding: 0 3px;
  }

  .mini {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1 1 0;
    font-size: 10px;
  }

  .mini input {
    width: 100%;
    min-width: 0;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 6px;
    text-transform: none;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink);
  }

  textarea {
    resize: vertical;
    width: 100%;
  }

  input[type='color'] {
    height: 24px;
    padding: 1px;
    width: 100%;
  }

  .hint {
    margin: 0;
    color: var(--ink-dim);
    font-size: 11px;
  }

  .links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .links li {
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--panel-3);
    padding: 2px 4px;
    font-size: 11px;
  }

  .dir {
    color: var(--accent);
    width: 1.6em;
    text-align: center;
  }

  .who {
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag {
    color: var(--ink-dim);
    font-size: 10px;
  }

  button.mini {
    padding: 0 4px;
    min-width: 0;
    flex: 0 0 auto;
    box-shadow: none;
  }

  .danger {
    background: var(--err);
    color: #160303;
    border-color: #160303;
  }
</style>
