// ============================================================
// crud.js — Label Manager
// CRUD компьютеров и принтеров.
// Футер модала редактирования: ← предыдущий | → следующий |
// Сохранить (без закрытия) | Отмена | Сохранить и закрыть
// ============================================================

// ===== MODAL OPEN / CLEAR =====
function openModal(type) {
  clearForm(type);
  document.getElementById('modal-' + type + '-title').textContent =
    type === 'computer' ? 'Добавить компьютер' : 'Добавить принтер';
  document.getElementById(type === 'computer' ? 'computer-edit-id' : 'printer-edit-id').value = '';
  // В режиме добавления кнопки навигации скрыты
  _setNavFooterMode(type, 'add');
  document.getElementById('modal-' + type).classList.add('open');
}

function clearForm(type) {
  if (type === 'computer') {
    ['c-name','c-ip','c-mac','c-cpu','c-mb','c-ram','c-ssd','c-serial','c-inv']
      .forEach(id => { document.getElementById(id).value = ''; });
  } else {
    ['p-model','p-name','p-ip','p-serial','p-inv']
      .forEach(id => { document.getElementById(id).value = ''; });
  }
}

// Переключение вида футера: 'add' — только Отмена + Сохранить и закрыть;
// 'edit' — полная навигационная строка
function _setNavFooterMode(type, mode) {
  const footer = document.getElementById('modal-' + type + '-footer');
  if (!footer) return;
  footer.querySelector('.footer-nav').style.display  = mode === 'edit' ? 'flex' : 'none';
  footer.querySelector('.footer-main').style.display = 'flex';
}

// ===== COMPUTERS CRUD =====

// Сохранить (без закрытия — остаёмся в модале)
function saveComputer(andClose = false) {
  const name = document.getElementById('c-name').value.trim();
  if (!name) { toast('Введите имя компьютера'); return; }
  const editId = document.getElementById('computer-edit-id').value;
  const obj = {
    id:     editId || genId(),
    name,
    ip:     v('c-ip'),
    mac:    v('c-mac'),
    cpu:    v('c-cpu'),
    mb:     v('c-mb'),
    ram:    v('c-ram'),
    ssd:    v('c-ssd'),
    serial: v('c-serial'),
    inv:    v('c-inv')
    // _suspect намеренно не включаем — ручное редактирование снимает пометку
  };
  if (editId) {
    const idx = db.computers.findIndex(c => c.id === editId);
    if (idx >= 0) db.computers[idx] = obj;
  } else {
    db.computers.push(obj);
    // После первого сохранения нового — переходим в режим edit (с навигацией)
    document.getElementById('computer-edit-id').value = obj.id;
    document.getElementById('modal-computer-title').textContent = 'Редактировать компьютер';
    _setNavFooterMode('computer', 'edit');
  }
  saveDB();
  renderComputers();
  toast(editId ? 'Компьютер обновлён' : 'Компьютер добавлен');
  if (andClose) closeModal('computer');
}

function editComputer(id) {
  const c = db.computers.find(x => x.id === id);
  if (!c) return;
  document.getElementById('computer-edit-id').value = c.id;
  document.getElementById('modal-computer-title').textContent = 'Редактировать компьютер';
  ['name','ip','mac','cpu','mb','ram','ssd','serial','inv'].forEach(f => {
    const el = document.getElementById('c-' + f);
    if (el) el.value = c[f] || '';
  });
  _setNavFooterMode('computer', 'edit');
  _updateComputerNavButtons(id);
  document.getElementById('modal-computer').classList.add('open');
}

function deleteComputer(id) {
  if (!confirm('Удалить компьютер?')) return;
  db.computers = db.computers.filter(c => c.id !== id);
  selected.delete('computer:' + id);
  saveDB();
  renderComputers();
  updateSelectedInfo();
  toast('Удалено');
}

// Навигация: предыдущий/следующий компьютер в списке
function navComputer(dir) {
  const editId = document.getElementById('computer-edit-id').value;
  const ids = db.computers.map(c => c.id);
  const idx = ids.indexOf(editId);
  if (idx < 0) return;
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= ids.length) return;
  editComputer(ids[nextIdx]);
}

function _updateComputerNavButtons(currentId) {
  const ids  = db.computers.map(c => c.id);
  const idx  = ids.indexOf(currentId);
  const btnPrev = document.getElementById('btn-computer-prev');
  const btnNext = document.getElementById('btn-computer-next');
  if (btnPrev) btnPrev.disabled = idx <= 0;
  if (btnNext) btnNext.disabled = idx < 0 || idx >= ids.length - 1;
}

// ===== PRINTERS CRUD =====

function savePrinter(andClose = false) {
  const model = document.getElementById('p-model').value.trim();
  if (!model) { toast('Введите модель принтера'); return; }
  const editId = document.getElementById('printer-edit-id').value;
  const obj = {
    id:     editId || genId(),
    model,
    name:   v('p-name'),
    ip:     v('p-ip'),
    serial: v('p-serial'),
    inv:    v('p-inv')
    // _suspect намеренно не включаем — ручное редактирование снимает пометку
  };
  if (editId) {
    const idx = db.printers.findIndex(p => p.id === editId);
    if (idx >= 0) db.printers[idx] = obj;
  } else {
    db.printers.push(obj);
    document.getElementById('printer-edit-id').value = obj.id;
    document.getElementById('modal-printer-title').textContent = 'Редактировать принтер';
    _setNavFooterMode('printer', 'edit');
  }
  saveDB();
  renderPrinters();
  toast(editId ? 'Принтер обновлён' : 'Принтер добавлен');
  if (andClose) closeModal('printer');
}

function editPrinter(id) {
  const p = db.printers.find(x => x.id === id);
  if (!p) return;
  document.getElementById('printer-edit-id').value = p.id;
  document.getElementById('modal-printer-title').textContent = 'Редактировать принтер';
  ['model','name','ip','serial','inv'].forEach(f => {
    const el = document.getElementById('p-' + f);
    if (el) el.value = p[f] || '';
  });
  _setNavFooterMode('printer', 'edit');
  _updatePrinterNavButtons(id);
  document.getElementById('modal-printer').classList.add('open');
}

function deletePrinter(id) {
  if (!confirm('Удалить принтер?')) return;
  db.printers = db.printers.filter(p => p.id !== id);
  selected.delete('printer:' + id);
  saveDB();
  renderPrinters();
  updateSelectedInfo();
  toast('Удалено');
}

function navPrinter(dir) {
  const editId = document.getElementById('printer-edit-id').value;
  const ids = db.printers.map(p => p.id);
  const idx = ids.indexOf(editId);
  if (idx < 0) return;
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= ids.length) return;
  editPrinter(ids[nextIdx]);
}

function _updatePrinterNavButtons(currentId) {
  const ids  = db.printers.map(p => p.id);
  const idx  = ids.indexOf(currentId);
  const btnPrev = document.getElementById('btn-printer-prev');
  const btnNext = document.getElementById('btn-printer-next');
  if (btnPrev) btnPrev.disabled = idx <= 0;
  if (btnNext) btnNext.disabled = idx < 0 || idx >= ids.length - 1;
}
