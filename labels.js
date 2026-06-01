// ============================================================
// labels.js — Label Manager
// Генераторы HTML-этикеток и логика вида печати.
// ============================================================
//
// Этикетки формируются как HTML-div, а не SVG.
// Ширина фиксирована через CSS (--lbl-width: 42mm).
// Высота — автоматическая, текст переносится нативно.
// Шрифт: Tahoma — системный Windows, интернет не нужен.
//
// Структура одной этикетки:
//   .lbl
//     .lbl-bar            — цветная полоска слева
//     .lbl-body
//       .lbl-title        — Имя / Модель, жирный
//       hr.lbl-divider
//       .lbl-table        — двухколоночная таблица
//         .lbl-row
//           .lbl-key      — метка (IP, MAC, ЦП…), фикс. ширина
//           .lbl-val      — значение, перенос автоматический
//       hr.lbl-divider
//       ...

// Экранирование HTML для значений этикетки
function h(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Одна строка таблицы: метка + значение
function row(key, val, valClass) {
  const cls = valClass ? ` class="lbl-val ${valClass}"` : ' class="lbl-val"';
  return `<div class="lbl-row">` +
         `<div class="lbl-key">${h(key)}</div>` +
         `<div${cls}>${h(val)}</div>` +
         `</div>`;
}

// ── Компьютер ──────────────────────────────────────────────
function computerLabelHTML(c) {
  return `
<div class="lbl lbl-pc">
  <div class="lbl-bar"></div>
  <div class="lbl-body">
    <div class="lbl-title">${h(c.name || '—')}</div>
    <hr class="lbl-divider">
    <div class="lbl-table">
      ${row('IP',  c.ip  || '', 'accent-pc')}
      ${row('MAC', c.mac || '', 'accent-pc')}
    </div>
    <hr class="lbl-divider">
    <div class="lbl-table">
      ${row('ЦП',  c.cpu || '', 'bold')}
      ${row('M/B', c.mb  || '', 'muted')}
      ${row('RAM', c.ram || '', 'bold')}
      ${row('SSD', c.ssd || '', 'bold')}
    </div>
    <hr class="lbl-divider">
    <div class="lbl-table">
      ${row('S/N', c.serial || '')}
      ${row('ИНВ', c.inv    || '', 'bold accent-pc')}
    </div>
  </div>
</div>`.trim();
}

// ── Принтер ────────────────────────────────────────────────
function printerLabelHTML(p) {
  return `
<div class="lbl lbl-pr">
  <div class="lbl-bar"></div>
  <div class="lbl-body">
    <div class="lbl-title">${h(p.model || '—')}</div>
    <hr class="lbl-divider">
    <div class="lbl-table">
      ${row('Имя', p.name || '', 'accent-pr')}
      ${row('IP',  p.ip   || '', 'accent-pr')}
    </div>
    <hr class="lbl-divider">
    <div class="lbl-table">
      ${row('S/N', p.serial || '')}
      ${row('ИНВ', p.inv    || '', 'bold accent-pr')}
    </div>
  </div>
</div>`.trim();
}

// ===== PRINT VIEW =====
function toggleBWMode(enabled) {
  const container = document.getElementById('print-labels-container');
  container.classList.toggle('bw', enabled);
}

function showPrintView() {
  if (selected.size === 0) {
    toast('Выберите хотя бы одну этикетку');
    return;
  }
  // Сбрасываем чёрно-белый режим при каждом открытии
  const bwCheckbox = document.getElementById('bw-mode');
  if (bwCheckbox) bwCheckbox.checked = false;

  const container = document.getElementById('print-labels-container');
  container.classList.remove('bw');
  container.innerHTML = '';

  selected.forEach(key => {
    const [type, id] = key.split(':');
    let html = '';
    if (type === 'computer') {
      const item = db.computers.find(c => c.id === id);
      if (!item) return;
      html = computerLabelHTML(item);
    } else {
      const item = db.printers.find(p => p.id === id);
      if (!item) return;
      html = printerLabelHTML(item);
    }
    container.insertAdjacentHTML('beforeend', html);
  });

  switchView('print');
}
