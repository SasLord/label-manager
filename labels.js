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

// ── QR-код ─────────────────────────────────────────────────
// Возвращает строку с SVG-кодом QR, или '' если данных нет или библиотека не загружена.
// data — строка JSON/текста для кодирования.
// size — размер в mm (число, без единиц).
function makeQRSvg(data, sizeMm) {
  if (!data || typeof qrcode === 'undefined') return '';
  try {
    const qr = qrcode(0, 'M'); // typeNumber=0 → авто, errorCorrection=M
    qr.addData(data);
    qr.make();
    // scalable=true → без px-атрибутов, размер задаём через CSS
    const svg = qr.createSvgTag({ scalable: true, margin: 1 });
    return `<div class="lbl-qr" style="width:${sizeMm}mm;height:${sizeMm}mm">${svg}</div>`;
  } catch(e) {
    return '';
  }
}

// Собирает компактный JSON для QR-кода компьютера (короткие ключи → меньше код)
function computerQRData(c) {
  const obj = {};
  if (c.name)   obj.n   = c.name;
  if (c.ip)     obj.ip  = c.ip;
  if (c.mac)    obj.mac = c.mac;
  if (c.cpu)    obj.cpu = c.cpu;
  if (c.ram)    obj.ram = c.ram;
  if (c.ssd)    obj.ssd = c.ssd;
  if (c.serial) obj.sn  = c.serial;
  if (c.inv)    obj.inv = c.inv;
  return JSON.stringify(obj);
}

// Собирает компактный JSON для QR-кода принтера
function printerQRData(p) {
  const obj = {};
  if (p.model)  obj.model = p.model;
  if (p.name)   obj.n     = p.name;
  if (p.ip)     obj.ip    = p.ip;
  if (p.serial) obj.sn    = p.serial;
  if (p.inv)    obj.inv   = p.inv;
  return JSON.stringify(obj);
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
  const qr = printOptions.qr ? makeQRSvg(computerQRData(c), 20) : '';
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
    ${qr}
  </div>
</div>`.trim();
}

// ── Принтер ────────────────────────────────────────────────
function printerLabelHTML(p) {
  const qr = printOptions.qr ? makeQRSvg(printerQRData(p), 20) : '';
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
    ${qr}
  </div>
</div>`.trim();
}

// ===== PRINT OPTIONS =====
// Объект с флагами режимов печати. Обновляется чекбоксами в тулбаре.
const printOptions = { bw: false, qr: false };

// ===== PRINT VIEW =====
function toggleBWMode(enabled) {
  printOptions.bw = enabled;
  document.getElementById('print-labels-container').classList.toggle('bw', enabled);
}

function toggleQRMode(enabled) {
  printOptions.qr = enabled;
  _rerenderPrintLabels();
}

function _rerenderPrintLabels() {
  const container = document.getElementById('print-labels-container');
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
  // Сохраняем BW-класс если он был включён
  container.classList.toggle('bw', printOptions.bw);
}

function showPrintView() {
  if (selected.size === 0) {
    toast('Выберите хотя бы одну этикетку');
    return;
  }

  // Сбрасываем оба режима при каждом открытии
  printOptions.bw = false;
  printOptions.qr = false;
  const bwCheckbox = document.getElementById('bw-mode');
  if (bwCheckbox) bwCheckbox.checked = false;
  const qrCheckbox = document.getElementById('qr-mode');
  if (qrCheckbox) qrCheckbox.checked = false;

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
