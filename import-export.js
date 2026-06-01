// ============================================================
// import-export.js — Label Manager
// JSON импорт/экспорт, очистка базы, импорт из AIDA64 HTML,
// массовое редактирование, вид «Требуют проверки».
// ============================================================

// ===== JSON EXPORT =====
function exportJSON() {
  const data = JSON.stringify(db, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'labelmanager-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Экспортировано');
}

// ===== JSON IMPORT =====
function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.computers || imported.printers) {
        const nc = (imported.computers || []).length;
        const np = (imported.printers  || []).length;
        if (confirm(`Импортировать? Это добавит данные к существующим.\nКомпьютеры: ${nc}, Принтеры: ${np}`)) {
          (imported.computers || []).forEach(c => {
            if (!db.computers.find(x => x.id === c.id)) db.computers.push(c);
          });
          (imported.printers || []).forEach(p => {
            if (!db.printers.find(x => x.id === p.id)) db.printers.push(p);
          });
          saveDB();
          renderComputers();
          renderPrinters();
          toast('Импортировано успешно');
        }
      } else {
        toast('Неверный формат файла');
      }
    } catch(err) { toast('Ошибка чтения файла'); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ===== CLEAR ALL =====
function confirmClearAll() {
  if (confirm('Очистить всю базу данных? Это действие необратимо.')) {
    db = { computers: [], printers: [] };
    selected.clear();
    saveDB();
    renderComputers();
    renderPrinters();
    updateSelectedInfo();
    toast('База очищена');
  }
}

// ===== BULK EDIT =====
function updateBulkEditBtn(type) {
  const singType = type === 'computers' ? 'computer' : 'printer';
  const count = [...selected].filter(k => k.startsWith(singType + ':')).length;
  const btn = document.getElementById('bulk-edit-' + type);
  if (btn) btn.style.display = count >= 2 ? '' : 'none';
}

function openBulkEdit(singType) {
  const modalId = 'modal-bulk-' + singType;
  document.querySelectorAll('#' + modalId + ' input[type=text]').forEach(el => el.value = '');
  const count = [...selected].filter(k => k.startsWith(singType + ':')).length;
  document.getElementById(modalId + '-title').textContent =
    `Массовое редактирование — ${count} ${singType === 'computer' ? 'компьютеров' : 'принтеров'}`;
  document.getElementById(modalId).classList.add('open');
}

function saveBulkEdit(singType) {
  const ids = [...selected]
    .filter(k => k.startsWith(singType + ':'))
    .map(k => k.split(':')[1]);
  if (!ids.length) { closeModal('bulk-' + singType); return; }

  const prefix = singType === 'computer' ? 'c' : 'p';
  const fields  = singType === 'computer'
    ? ['cpu', 'mb', 'ram', 'ssd', 'ip', 'inv']
    : ['ip', 'inv'];

  const changes = {};
  fields.forEach(f => {
    const val = document.getElementById('bulk-' + prefix + '-' + f).value.trim();
    if (val) changes[f] = val;
  });

  if (!Object.keys(changes).length) {
    toast('Нет изменений — все поля пусты');
    return;
  }

  const arr = singType === 'computer' ? db.computers : db.printers;
  ids.forEach(id => {
    const idx = arr.findIndex(x => x.id === id);
    if (idx >= 0) Object.assign(arr[idx], changes);
  });

  saveDB();
  if (singType === 'computer') renderComputers();
  else renderPrinters();
  closeModal('bulk-' + singType);
  toast(`Обновлено ${ids.length} записей`);
}

// ===== SUSPECT VIEW =====
function renderSuspect() {
  const list  = document.getElementById('suspect-list');
  const empty = document.getElementById('suspect-empty');

  const suspects = [
    ...db.computers.filter(x => x._suspect).map(x => ({ ...x, _type: 'computer' })),
    ...db.printers.filter(x => x._suspect).map(x => ({ ...x, _type: 'printer'  }))
  ];

  if (!suspects.length) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = suspects.map(item => {
    const typeLabel   = item._type === 'computer' ? 'Компьютер' : 'Принтер';
    const title       = item._type === 'computer' ? item.name : item.model;
    const suspectList = (item._suspectFields || []).join(', ');
    const editCall    = item._type === 'computer'
      ? `editComputer('${item.id}');switchView('computers')`
      : `editPrinter('${item.id}');switchView('printers')`;
    return `<div style="background:var(--surface);border:1px solid #e8c070;border-left:3px solid var(--amber);border-radius:var(--radius);padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <span style="font-size:20px">${item._type === 'computer' ? '🖥' : '🖨'}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${esc(title || '—')} <span style="font-weight:400;color:var(--text3);font-size:11px">${typeLabel}</span></div>
        ${suspectList ? `<div style="font-size:11px;color:var(--amber);margin-top:2px">Поля под вопросом: ${esc(suspectList)}</div>` : ''}
      </div>
      <button class="btn btn-sm" onclick="${editCall}">✏ Исправить</button>
    </div>`;
  }).join('');
}

// ===== AIDA64 IMPORT =====

// Значения-«мусор», которые AIDA пишет когда производитель не заполнил поле
const AIDA_JUNK = [
  'default string', 'to be filled by o.e.m.', 'not specified',
  'unknown', 'none', 'n/a', 'o.e.m.', 'oem',
  'system product name', 'system manufacturer', 'base board product',
  '0', '', '-'
];

function isJunk(val) {
  if (!val) return true;
  return AIDA_JUNK.includes(val.trim().toLowerCase());
}

// Строим Map из всех <TR> страницы: "ключ нижний регистр" → "значение"
// В AIDA-отчёте строки: <TR><TD><TD><TD>Метка&nbsp;&nbsp;<TD>Значение
function parseAidaTable(doc) {
  const map = new Map();
  doc.querySelectorAll('tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length < 2) return;
    const keyTd = tds[tds.length - 2];
    const valTd = tds[tds.length - 1];
    const key   = keyTd.textContent.replace(/\u00a0/g, ' ').trim();
    const val   = valTd.textContent.replace(/\u00a0/g, ' ').trim();
    if (key && val) map.set(key.toLowerCase(), val);
  });
  return map;
}

// Первое совпадение по массиву подстрок-ключей
function mapGet(map, ...keys) {
  for (const k of keys) {
    for (const [mk, mv] of map) {
      if (mk.includes(k.toLowerCase())) return mv;
    }
  }
  return '';
}

// "16165 МБ" → "16 Gb", "32 ГБ" → "32 Gb"
function normalizeRAM(raw) {
  if (!raw) return '';
  const mb = raw.match(/(\d+)\s*[МM][Бб]/i);
  if (mb) return Math.round(parseInt(mb[1]) / 1024) + ' Gb';
  const gb = raw.match(/(\d+)\s*[ГG][Бб]/i);
  if (gb) return gb[1] + ' Gb';
  return raw;
}

// "Patriot P210 512GB (512 ГБ, SATA-III)" → "512 Gb"
function normalizeStorage(raw) {
  if (!raw) return '';
  const m1 = raw.match(/\((\d+)\s*[ГGгg][Бб]/i);
  if (m1) return m1[1] + ' Gb';
  const m2 = raw.match(/(\d+)\s*GB/i);
  if (m2) return m2[1] + ' Gb';
  const m3 = raw.match(/(\d+)\s*[ГGгg][Бб]/i);
  if (m3) return m3[1] + ' Gb';
  return raw;
}

// Убираем ссылки из CPU-строки (иногда textContent содержит href-текст)
function normalizeCPU(raw) {
  if (!raw) return '';
  return raw.replace(/https?:\/\/\S+/g, '').trim();
}

// Убираем хвост "(1 PCI-E x1, ...)" и ссылки из строки M/B
function normalizeMB(raw) {
  if (!raw) return '';
  return raw.replace(/\s*\(1 PCI.*$/i, '').replace(/https?:\/\/\S+/g, '').trim();
}

function isValidIP(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test((ip || '').trim());
}
function isValidMAC(mac) {
  return /^([0-9A-F]{2}[-:]){5}[0-9A-F]{2}$/i.test((mac || '').trim());
}

// Разбор одного AIDA HTML файла → { record, suspectFields }
function parseAidaFile(text) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(text, 'text/html');
  const map    = parseAidaTable(doc);

  // Имя компьютера
  let name = mapGet(map, 'имя компьютера', 'компьютер', 'computer');
  if (!name) {
    const titleMatch = doc.title.match(/<(.+?)>/);
    if (titleMatch) name = titleMatch[1];
  }

  // CPU
  let cpu = mapGet(map, 'тип цп', 'тип процессора', 'cpu type');
  cpu = normalizeCPU(cpu);

  // M/B
  let mb = mapGet(map, 'системная плата', 'материнская плата', 'motherboard', 'system board');
  mb = normalizeMB(mb);

  // RAM
  const ramRaw = mapGet(map, 'системная память', 'оперативная память', 'memory', 'физическая память');
  const ram    = normalizeRAM(ramRaw);

  // SSD
  const ssdRaw = mapGet(map, 'дисковый накопитель', 'накопитель', 'disk drive', 'жёсткий диск');
  const ssd    = normalizeStorage(ssdRaw);

  // IP
  let ip = mapGet(map, 'первичный адрес ip', 'ip-адрес', 'ip address', 'первичный ip');
  const ipMatch = ip.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
  ip = ipMatch ? ipMatch[0] : ip;

  // MAC
  let mac = mapGet(map, 'первичный адрес mac', 'mac-адрес', 'mac address', 'первичный mac');
  const macMatch = mac.match(/([0-9A-F]{2}[-:]){5}[0-9A-F]{2}/i);
  mac = macMatch ? macMatch[0].toUpperCase().replace(/:/g, '-') : mac;

  // Серийный номер M/B из DMI
  let serial = mapGet(map, 'dmi серийный номер системной платы', 'dmi серийный номер', 'serial number');
  if (isJunk(serial)) serial = '';

  const record = { id: genId(), name, ip, mac, cpu, mb, ram, ssd, serial, inv: '' };

  const suspectFields = [];
  if (!name || isJunk(name))     suspectFields.push('Имя');
  if (!ip   || !isValidIP(ip))   suspectFields.push('IP');
  if (!mac  || !isValidMAC(mac)) suspectFields.push('MAC');
  if (!cpu  || isJunk(cpu))      suspectFields.push('ЦП');
  if (!mb   || isJunk(mb))       suspectFields.push('M/B');
  if (!ram  || isJunk(ram))      suspectFields.push('RAM');
  if (!ssd  || isJunk(ssd))      suspectFields.push('SSD');

  if (suspectFields.length) {
    record._suspect       = true;
    record._suspectFields = suspectFields;
  }

  return { record, suspectFields };
}

// Накопитель для превью перед подтверждением
let _aidaPendingRecords = [];

function importAIDA(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  event.target.value = '';

  _aidaPendingRecords = [];
  let processed = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      processed++;
      try {
        const { record } = parseAidaFile(e.target.result);
        // Fallback имени из имени файла
        if (!record.name || isJunk(record.name)) {
          record.name = file.name.replace(/\.htm[l]?$/i, '');
          record._suspectFields = (record._suspectFields || []).filter(f => f !== 'Имя');
          if (!record._suspectFields.length) delete record._suspect;
        }
        _aidaPendingRecords.push(record);
      } catch(err) {
        _aidaPendingRecords.push({ _parseError: file.name });
      }
      if (processed === files.length) showAidaReview();
    };
    reader.readAsText(file, 'windows-1251');
  });
}

function showAidaReview() {
  const body = document.getElementById('aida-review-body');
  if (!_aidaPendingRecords.length) { toast('Нет файлов для импорта'); return; }

  const rows = _aidaPendingRecords.map(rec => {
    if (rec._parseError) {
      return `<div style="background:var(--accent2-light);border:1px solid rgba(192,57,43,.3);border-radius:var(--radius);padding:8px 12px;margin-bottom:6px;font-size:12px;color:var(--accent2)">
        ✕ Ошибка разбора файла: ${esc(rec._parseError)}
      </div>`;
    }
    const alreadyExists = !!db.computers.find(c => c.name === rec.name);
    const suspect = rec._suspect;
    const fields  = (rec._suspectFields || []).join(', ');

    return `<div style="background:var(--surface);border:1px solid ${suspect ? '#e8c070' : 'var(--border)'};border-left:3px solid ${suspect ? 'var(--amber)' : 'var(--green)'};border-radius:var(--radius);padding:10px 12px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <strong style="font-size:13px">${esc(rec.name || '—')}</strong>
        ${suspect
          ? `<span style="font-size:10px;color:var(--amber);background:var(--amber-light);border:1px solid #e8c070;border-radius:10px;padding:1px 7px">⚠ поля под вопросом</span>`
          : `<span style="font-size:10px;color:var(--green);background:var(--green-light);border:1px solid #a0d0b0;border-radius:10px;padding:1px 7px">✓ ОК</span>`}
        ${alreadyExists ? `<span style="font-size:10px;color:var(--accent2);background:var(--accent2-light);border:1px solid rgba(192,57,43,.3);border-radius:10px;padding:1px 7px">уже есть в БД</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;font-size:11px;color:var(--text2);font-family:var(--mono)">
        <div><span style="color:var(--text3)">IP:</span> ${esc(rec.ip  || '—')}</div>
        <div><span style="color:var(--text3)">MAC:</span> ${esc(rec.mac || '—')}</div>
        <div><span style="color:var(--text3)">ЦП:</span> ${esc(rec.cpu || '—')}</div>
        <div><span style="color:var(--text3)">M/B:</span> ${esc(rec.mb  || '—')}</div>
        <div><span style="color:var(--text3)">RAM:</span> ${esc(rec.ram || '—')}</div>
        <div><span style="color:var(--text3)">SSD:</span> ${esc(rec.ssd || '—')}</div>
        <div><span style="color:var(--text3)">S/N:</span> ${esc(rec.serial || '—')}</div>
      </div>
      ${fields ? `<div style="font-size:11px;color:var(--amber);margin-top:5px">Требуют ручной проверки: ${esc(fields)}</div>` : ''}
    </div>`;
  });

  const total        = _aidaPendingRecords.filter(r => !r._parseError).length;
  const suspectCount = _aidaPendingRecords.filter(r =>  r._suspect).length;

  body.innerHTML = `<div style="font-size:12px;color:var(--text2);margin-bottom:12px">
    Файлов: <strong>${_aidaPendingRecords.length}</strong> &nbsp;·&nbsp;
    Готовы к импорту: <strong>${total}</strong> &nbsp;·&nbsp;
    Требуют проверки: <strong style="color:var(--amber)">${suspectCount}</strong>
  </div>` + rows.join('');

  document.getElementById('modal-aida-review').classList.add('open');
}

function confirmAidaImport() {
  let added = 0, skipped = 0;
  _aidaPendingRecords.forEach(rec => {
    if (rec._parseError) return;
    if (db.computers.find(c => c.name === rec.name)) { skipped++; }
    else { db.computers.push(rec); added++; }
  });
  saveDB();
  renderComputers();
  updateCounts();
  closeModal('aida-review');
  _aidaPendingRecords = [];
  toast(`Добавлено: ${added}${skipped ? ', пропущено (дубликат): ' + skipped : ''}`);
}
