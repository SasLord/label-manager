// ============================================================
// app.js — Label Manager
// Данные, навигация, выбор, рендер таблиц, утилиты, инит.
// ============================================================

// ===== DATA =====
let db = { computers: [], printers: [] };
let selected = new Set(); // "computer:id" | "printer:id"
let lastView = 'computers';

function loadDB() {
  try {
    const s = localStorage.getItem('labelmanager_db');
    if (s) db = JSON.parse(s);
    if (!db.computers) db.computers = [];
    if (!db.printers)  db.printers  = [];
  } catch(e) { db = { computers: [], printers: [] }; }
}

function saveDB() {
  localStorage.setItem('labelmanager_db', JSON.stringify(db));
  updateCounts();
  updateSelectedInfo();
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===== NAVIGATION =====
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  if (name !== 'print') lastView = name;
  if (name === 'computers') renderComputers();
  if (name === 'printers')  renderPrinters();
  if (name === 'suspect')   renderSuspect();
}

// ===== COUNTS =====
function updateCounts() {
  document.getElementById('count-computers').textContent = db.computers.length;
  document.getElementById('count-printers').textContent  = db.printers.length;
  const suspectCount = [...db.computers, ...db.printers].filter(x => x._suspect).length;
  document.getElementById('count-suspect').textContent = suspectCount;
}

// ===== SELECTION =====
function toggleSelect(type, id) {
  const key = type + ':' + id;
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  updateSelectedInfo();
  updateRowHighlight(type, id);
  updateBulkEditBtn(type === 'computer' ? 'computers' : 'printers');
}

function updateRowHighlight(type, id) {
  const row = document.getElementById('row-' + type + '-' + id);
  if (!row) return;
  const key = type + ':' + id;
  row.classList.toggle('selected', selected.has(key));
  const cb = row.querySelector('input[type=checkbox]');
  if (cb) cb.checked = selected.has(key);
}

function updateSelectedInfo() {
  const n = selected.size;
  document.getElementById('selected-count').textContent = n + ' этикеток';
  if (n === 0) {
    document.getElementById('selected-desc').textContent = 'Ничего не выбрано';
  } else {
    const comps = [...selected].filter(k => k.startsWith('computer:')).length;
    const prs   = [...selected].filter(k => k.startsWith('printer:')).length;
    const parts = [];
    if (comps) parts.push(comps + ' компьютер' + (comps > 1 ? 'ов' : ''));
    if (prs)   parts.push(prs   + ' принтер'   + (prs   > 1 ? 'ов' : ''));
    document.getElementById('selected-desc').textContent = parts.join(', ');
  }
}

function toggleAll(type, masterCb) {
  const singType = type === 'computers' ? 'computer' : 'printer';
  const items    = type === 'computers' ? db.computers : db.printers;
  items.forEach(item => {
    const k = singType + ':' + item.id;
    if (masterCb.checked) selected.add(k);
    else selected.delete(k);
  });
  if (type === 'computers') renderComputers();
  else renderPrinters();
  updateSelectedInfo();
  updateBulkEditBtn(type);
}

function selectAll(type) {
  const singType = type === 'computers' ? 'computer' : 'printer';
  const items    = type === 'computers' ? db.computers : db.printers;
  items.forEach(item => selected.add(singType + ':' + item.id));
  if (type === 'computers') renderComputers();
  else renderPrinters();
  updateSelectedInfo();
  updateBulkEditBtn(type);
}

function updateBulkEditBtn(type) {
  const singType = type === 'computers' ? 'computer' : 'printer';
  const btn = document.getElementById('bulk-edit-' + type);
  if (!btn) return;
  const hasSelected = [...selected].some(k => k.startsWith(singType + ':'));
  btn.style.display = hasSelected ? '' : 'none';
}

function clearSelection() {
  selected.clear();
  renderComputers();
  renderPrinters();
  updateSelectedInfo();
  updateBulkEditBtn('computers');
  updateBulkEditBtn('printers');
}

// ===== RENDER TABLES =====
function renderComputers() {
  const tbody   = document.getElementById('computers-tbody');
  const empty   = document.getElementById('computers-empty');
  const wrap    = tbody.closest('.table-wrap');

  if (!db.computers.length) {
    wrap.style.display  = 'none';
    empty.style.display = 'block';
    updateBulkEditBtn('computers');
    return;
  }
  wrap.style.display  = '';
  empty.style.display = 'none';

  const masterCb = document.getElementById('check-all-computers');
  masterCb.checked = db.computers.every(c => selected.has('computer:' + c.id));

  tbody.innerHTML = db.computers.map(c => {
    const sel = selected.has('computer:' + c.id);
    const suspectBadge = c._suspect
      ? `<span title="Требует проверки" style="color:var(--amber);font-size:13px;margin-left:4px">⚠</span>` : '';
    return `<tr id="row-computer-${c.id}" class="${sel ? 'selected' : ''}" onclick="toggleSelect('computer','${c.id}')">
      <td class="check-cell" onclick="event.stopPropagation()">
        <input type="checkbox" ${sel ? 'checked' : ''} onchange="toggleSelect('computer','${c.id}')">
      </td>
      <td><strong>${esc(c.name)}</strong>${suspectBadge}</td>
      <td class="mono">${esc(c.ip  || '—')}</td>
      <td class="mono">${esc(c.mac || '—')}</td>
      <td style="font-size:12px">${esc(c.cpu || '—')}</td>
      <td class="mono">${esc(c.ram || '—')}</td>
      <td class="mono">${esc(c.ssd || '—')}</td>
      <td class="mono">${esc(c.inv || '—')}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        <button class="btn btn-sm" onclick="editComputer('${c.id}')">✏</button>
        <button class="btn btn-sm btn-danger" onclick="deleteComputer('${c.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');

  updateBulkEditBtn('computers');
}

function renderPrinters() {
  const tbody = document.getElementById('printers-tbody');
  const empty = document.getElementById('printers-empty');
  const wrap  = tbody.closest('.table-wrap');

  if (!db.printers.length) {
    wrap.style.display  = 'none';
    empty.style.display = 'block';
    updateBulkEditBtn('printers');
    return;
  }
  wrap.style.display  = '';
  empty.style.display = 'none';

  const masterCb = document.getElementById('check-all-printers');
  masterCb.checked = db.printers.every(p => selected.has('printer:' + p.id));

  tbody.innerHTML = db.printers.map(p => {
    const sel = selected.has('printer:' + p.id);
    const suspectBadge = p._suspect
      ? `<span title="Требует проверки" style="color:var(--amber);font-size:13px;margin-left:4px">⚠</span>` : '';
    return `<tr id="row-printer-${p.id}" class="${sel ? 'selected' : ''}" onclick="toggleSelect('printer','${p.id}')">
      <td class="check-cell" onclick="event.stopPropagation()">
        <input type="checkbox" ${sel ? 'checked' : ''} onchange="toggleSelect('printer','${p.id}')">
      </td>
      <td><strong>${esc(p.model)}</strong>${suspectBadge}</td>
      <td class="mono">${esc(p.name   || '—')}</td>
      <td class="mono">${esc(p.ip     || '—')}</td>
      <td class="mono">${esc(p.serial || '—')}</td>
      <td class="mono">${esc(p.inv    || '—')}</td>
      <td class="actions-cell" onclick="event.stopPropagation()">
        <button class="btn btn-sm" onclick="editPrinter('${p.id}')">✏</button>
        <button class="btn btn-sm btn-danger" onclick="deletePrinter('${p.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');

  updateBulkEditBtn('printers');
}

// ===== UTILS =====
function v(id) { return document.getElementById(id).value.trim(); }

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ===== MODAL INFRASTRUCTURE =====
function closeModal(type) {
  document.getElementById('modal-' + type).classList.remove('open');
}

// Закрытие любого открытого модала по Escape
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.modal-overlay.open');
  if (!open) return;
  const type = open.id.replace('modal-', '');
  closeModal(type);
});

// Закрытие по клику на оверлей (все модалы)
document.addEventListener('mousedown', e => {
  if (!e.target.classList.contains('modal-overlay')) return;
  const type = e.target.id.replace('modal-', '');
  closeModal(type);
});

// ===== INIT =====
loadDB();
updateCounts();
renderComputers();
updateSelectedInfo();
