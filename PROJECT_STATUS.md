# Label Manager — PROJECT STATUS

> Документ для продолжения разработки в новом диалоге.  
> Разработка ведётся на **macOS**, приложение используется на **Windows 10**.  
> Интернет на рабочем месте **отсутствует**.

---

## Что это за проект

Веб-приложение для печати инвентарных этикеток на оргтехнику.  
Запускается как локальный HTML-файл в браузере — установка не требуется.  
Этикетки печатаются на листе A4, вырезаются и приклеиваются на широкий скотч.

**Ширина этикетки: 42 mm. Высота: автоматическая (по содержимому).**

---

## Файловая структура

Все три файла лежат в **одной папке**:

```
label-manager.html   — весь HTML + JavaScript (база, CRUD, генераторы этикеток)
global.css           — стили интерфейса приложения (layout, таблицы, формы, модалы)
print.css            — стили HTML-этикеток (размеры в mm, печать, @media print)
```

Никаких зависимостей, серверов, Node.js — открыть `label-manager.html` в Chrome/Edge.

---

## Технические решения и важные наработки

### Шрифты
- Используется **Tahoma, Arial, sans-serif** — системные шрифты Windows.
- Google Fonts и любые внешние ресурсы **убраны полностью** (нет интернета).
- Моноширинный шрифт: `'Courier New', Courier, monospace`.

### База данных
- Хранится в **`localStorage`** под ключом `labelmanager_db`.
- Формат: `{ computers: [...], printers: [...] }`.
- Каждая запись имеет поле `id` (генерируется через `genId()` = `Date.now().toString(36) + random`).
- **Экспорт** — скачивает JSON-файл с датой в имени.
- **Импорт** — merge (добавляет новые записи, не затирает существующие по `id`).

### Генераторы этикеток
**Ключевое решение:** этикетки формируются как **HTML `<div>`**, а не SVG.

Причина отказа от SVG:
- SVG требует ручного расчёта координат в mm.
- Перенос текста в SVG не работает автоматически.
- HTML+CSS решает оба вопроса нативно.

**Структура одной этикетки (HTML):**
```html
<div class="lbl lbl-pc">           <!-- lbl-pc или lbl-pr -->
  <div class="lbl-bar"></div>      <!-- цветная полоска слева -->
  <div class="lbl-body">
    <div class="lbl-title">...</div>
    <hr class="lbl-divider">
    <div class="lbl-table">        <!-- двухколоночная таблица через display:table -->
      <div class="lbl-row">
        <div class="lbl-key">IP</div>        <!-- фикс. ширина 7mm, серый -->
        <div class="lbl-val accent-pc">...</div>  <!-- остаток, перенос авто -->
      </div>
    </div>
    <hr class="lbl-divider">
    ...
  </div>
</div>
```

**Классы-модификаторы `.lbl-val`:**
- `bold` — жирный текст
- `muted` — приглушённый цвет (#444)
- `accent-pc` — синий (#1a3a5c), жирный
- `accent-pr` — зелёный (#1a5c3a), жирный

### Расположение этикеток на листе
`flex-wrap: wrap` + `gap` → этикетки выстраиваются **по горизонтали** (при 42mm на A4 влезает 4 в ряд с зазором 3mm), потом переход на следующую строку.

### Ключевые CSS-переменные этикеток (в `print.css`)
```css
--lbl-width:       42mm;
--lbl-pad-x:       1.8mm;
--lbl-pad-y:       1.4mm;
--lbl-bar-width:   1.6mm;
--lbl-gap-col:     3mm;
--lbl-gap-row:     3mm;
--lbl-font:        Tahoma, Arial, sans-serif;
--lbl-fs:          7.5pt;
--lbl-fs-title:    8.5pt;
--lbl-fs-label:    6pt;
--lbl-col-label:   7mm;   /* ширина колонки меток (IP, MAC, ЦП…) */
--lc-pc:           #1a3a5c;   /* цвет компьютер */
--lc-pr:           #1a5c3a;   /* цвет принтер */
```

### Печать
- `@media print` скрывает весь UI, оставляет только `#view-print`.
- `@page { size: A4 portrait; margin: 0; }` — поля убраны через CSS.
- В диалоге печати браузера нужно выбрать: **без полей**, масштаб 100%, A4.
- Для PDF: «Сохранить как PDF» в диалоге печати.
- `print-color-adjust: exact` — обязательно для цветных полосок.

---

## Реализованные типы устройств

### Компьютер (`computers`)
Поля в базе: `id, name, ip, mac, cpu, mb, ram, ssd, serial, inv`

Структура этикетки:
```
┌──────────────────────────────────────────┐
│▌ 1-10-5                                  │  ← lbl-title, жирный
│▌ ─────────────────────────────────────── │
│▌ IP   │ 192.168.11.74                    │  ← accent-pc
│▌ MAC  │ D8-43-AE-78-66-E2               │  ← accent-pc
│▌ ─────────────────────────────────────── │
│▌ ЦП   │ Intel Core i5-12400, 4200 MHz    │  ← bold, перенос авто
│▌ M/B  │ MSI Pro H610M-E DDR4 (MS-7D48)  │  ← muted, перенос авто
│▌ RAM  │ 16 Gb                            │  ← bold
│▌ SSD  │ 512 Gb                           │  ← bold
│▌ ─────────────────────────────────────── │
│▌ S/N  │ 07D4822_O31E344009               │
│▌ ИНВ  │ SMU-31-00000123                  │  ← bold accent-pc
└──────────────────────────────────────────┘
```

Пример данных:
```
Имя: 1-10-5
IP: 192.168.11.74
MAC: D8-43-AE-78-66-E2
ЦП: Intel Core i5-12400, 4200 MHz
M/B: MSI Pro H610M-E DDR4 (MS-7D48)
RAM: 16 Gb
SSD: 512 Gb
Серийный №: 07D4822_O31E344009
Инвентарный №: SMU-31-00000123
```

### Принтер (`printers`)
Поля в базе: `id, model, name, ip, serial, inv`

Структура этикетки:
```
┌──────────────────────────────────────────┐
│▌ Kyocera ECOSYS M2375dnKX                │  ← lbl-title, перенос авто
│▌ ─────────────────────────────────────── │
│▌ Имя  │ KM956366                         │  ← accent-pr
│▌ IP   │ 192.168.11.233                   │  ← accent-pr
│▌ ─────────────────────────────────────── │
│▌ S/N  │ R5M9731347                       │
│▌ ИНВ  │ SMU-31-00000053                  │  ← bold accent-pr
└──────────────────────────────────────────┘
```

---

## Интерфейс приложения

**Layout:** CSS Grid — header (full width) + sidebar 260px + main.

**Сайдбар:**
- Навигация по типам устройств (с счётчиком записей)
- Блок «Выбрано» — показывает сколько этикеток выбрано и каких типов
- Кнопка «Снять выделение»
- Кнопка «Очистить всё» (с подтверждением)

**Основная область:**
- Таблица с чекбоксами (клик по строке = выбор)
- Мастер-чекбокс в шапке таблицы
- Кнопки «Выбрать все» и «+ Добавить»
- Редактирование (✏) и удаление (✕) каждой записи

**Хедер:**
- Экспорт JSON / Импорт JSON
- Кнопка «Печать выбранных» → переход в режим предпросмотра

**Режим печати (view-print):**
- Те же HTML-этикетки, что идут на принтер
- Кнопки «← Назад» и «⎙ Распечатать / PDF»
- Подсказка с настройками диалога печати

**Модальные окна:** форма добавления/редактирования, закрываются кликом по оверлею.

**Toast-уведомления:** появляются внизу справа на 2.2 сек.

---

## Что ещё нужно реализовать (TODO)

### Новые типы устройств
Запланировано добавить по аналогии с компьютерами и принтерами. Нужно для каждого:
1. Добавить пункт в сайдбар (HTML)
2. Добавить таблицу с колонками (HTML)
3. Добавить модальную форму (HTML)
4. Добавить CRUD-функции (JS)
5. Добавить генератор этикетки `xxxxxLabelHTML()` (JS)
6. Добавить поле массива в `db` и `loadDB()`

Предполагаемые типы:
- **Мониторы** — модель, серийный №, инвентарный №, диагональ, разрешение
- **Сетевое оборудование** (свитчи, роутеры) — модель, IP, MAC, серийный №, инвентарный №
- **МФУ / сканеры** — отдельно от принтеров или объединить?
- **Ноутбуки** — как компьютеры + модель
- **Другое** — универсальный тип со свободными полями

### Прочие улучшения
- [ ] Поиск/фильтрация по таблице
- [ ] Сортировка колонок
- [ ] Дублирование записи (кнопка «Копировать»)
- [ ] Счётчик количества этикеток на листе A4 (сколько влезет)
- [ ] Настройка количества копий одной этикетки перед печатью
- [ ] Возможность выбрать только часть полей для отображения на этикетке

---

## Известные проблемы и замечания

1. **Шрифты на экране vs на бумаге.** Браузер рендерит `pt` немного по-разному на экране и принтере. Финальный размер лучше проверять пробной печатью, а не по предпросмотру.

2. **Поля в диалоге печати.** `@page { margin: 0 }` работает в Chrome/Edge. В Firefox может потребоваться вручную убрать поля в настройках печати. Рекомендуется Chrome или Edge.

3. **localStorage — один браузер.** Данные привязаны к браузеру и профилю. При смене браузера нужен экспорт/импорт JSON. Для переноса данных между ПК — только через JSON-файл.

4. **`lbl-col-label: 7mm`** — ширина колонки меток. Если добавить тип устройства с длинными метками (например, «Модель»), может потребоваться увеличить до 9–10mm.

5. **Прежняя SVG-попытка провалилась** по двум причинам: (а) координаты в px не соответствовали реальным mm при печати; (б) `font-size` в SVG-единицах без `pt` рендерился мелко. HTML-подход решил обе проблемы.

6. **Предпросмотр на экране** показывает те же HTML-блоки, что идут на печать — никакого отдельного "превью". Что видишь на экране в режиме предпросмотра, то и напечатается (с поправкой на п.1).

---

## Структура JS-кода (`label-manager.html`)

```
// ===== DATA =====
  db, selected (Set), lastView
  loadDB(), saveDB(), genId()

// ===== NAVIGATION =====
  switchView(name)

// ===== COUNTS =====
  updateCounts()

// ===== SELECTION =====
  toggleSelect(type, id)
  updateRowHighlight(type, id)
  updateSelectedInfo()
  toggleAll(type, masterCb)
  selectAll(type)
  clearSelection()

// ===== RENDER TABLES =====
  renderComputers()
  renderPrinters()

// ===== MODAL =====
  openModal(type)
  closeModal(type)
  clearForm(type)

// ===== COMPUTERS CRUD =====
  saveComputer()
  editComputer(id)
  deleteComputer(id)

// ===== PRINTERS CRUD =====
  savePrinter()
  editPrinter(id)
  deletePrinter(id)

// ===== LABEL HTML GENERATORS =====
  h(s)                    — экранирование HTML
  row(key, val, valClass) — строка таблицы этикетки
  computerLabelHTML(c)    — HTML-этикетка компьютера
  printerLabelHTML(p)     — HTML-этикетка принтера

// ===== PRINT VIEW =====
  showPrintView()

// ===== IMPORT / EXPORT =====
  exportJSON()
  importJSON(event)
  confirmClearAll()

// ===== UTILS =====
  v(id)      — значение input по id
  esc(s)     — экранирование HTML (старый вариант, используется в renderComputers/renderPrinters)
  toast(msg)

// ===== INIT =====
  loadDB(), updateCounts(), renderComputers(), updateSelectedInfo()
```

---

## Как добавить новый тип устройства (инструкция)

### 1. Сайдбар (HTML)
```html
<div class="nav-item" onclick="switchView('monitors')" id="nav-monitors">
  <span class="nav-icon">🖵</span> Мониторы
  <span class="nav-count" id="count-monitors">0</span>
</div>
```

### 2. View с таблицей (HTML)
```html
<div class="view" id="view-monitors">
  <div class="toolbar">
    <h2>Мониторы</h2>
    <button class="btn" onclick="selectAll('monitors')">Выбрать все</button>
    <button class="btn btn-primary" onclick="openModal('monitor')">+ Добавить</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th class="check-cell"><input type="checkbox" id="check-all-monitors" onchange="toggleAll('monitors',this)"></th>
          <th>Модель</th>
          <th>Серийный №</th>
          <th>Инв. №</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody id="monitors-tbody"></tbody>
    </table>
  </div>
</div>
```

### 3. Модальная форма (HTML)
```html
<div class="modal-overlay" id="modal-monitor">
  <div class="modal">
    <h3 id="modal-monitor-title">Добавить монитор</h3>
    <input type="hidden" id="monitor-edit-id">
    <div class="form-grid">
      <div class="form-group form-full">
        <label>Модель *</label>
        <input type="text" id="m-model" placeholder="...">
      </div>
      <!-- остальные поля -->
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('monitor')">Отмена</button>
      <button class="btn btn-primary" onclick="saveMonitor()">Сохранить</button>
    </div>
  </div>
</div>
```

### 4. JS: инициализация
В `loadDB()` добавить: `if (!db.monitors) db.monitors = [];`  
В `updateCounts()` добавить: `document.getElementById('count-monitors').textContent = db.monitors.length;`

### 5. JS: генератор этикетки
```js
function monitorLabelHTML(m) {
  return `
<div class="lbl lbl-mn">
  <div class="lbl-bar"></div>
  <div class="lbl-body">
    <div class="lbl-title">${h(m.model || '—')}</div>
    <hr class="lbl-divider">
    <div class="lbl-table">
      ${row('S/N', m.serial || '')}
      ${row('ИНВ', m.inv    || '', 'bold accent-mn')}
    </div>
  </div>
</div>`.trim();
}
```

### 6. CSS для нового типа (в `print.css`)
```css
--lc-mn: #7a4a0a;   /* цвет монитора — янтарный */

.lbl-mn { --bar-color: var(--lc-mn); border-color: #c8a878; }
.lbl-val.accent-mn { color: var(--lc-mn); font-weight: bold; }
```

---

## Цвета по типам устройств (принятая схема)

| Тип            | Цвет полоски | HEX       |
|----------------|--------------|-----------|
| Компьютер      | Синий        | `#1a3a5c` |
| Принтер        | Зелёный      | `#1a5c3a` |
| Монитор        | Янтарный     | `#7a4a0a` |
| Сетевое обор.  | Фиолетовый   | `#3a1a5c` |
| Ноутбук        | Тёмно-синий  | `#1a2a4a` |
