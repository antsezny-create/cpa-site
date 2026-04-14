// ══════════════════════════════════════════════════════
//  CALENDAR.JS  — v2
// ══════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────
let calInitialized = false;
let calView        = 'month';
let calCurrentDate = new Date();
let calMiniDate    = new Date();
let calEvents      = [];
let editingEventId = null;
let userCalendars  = [];   // user-created calendars from settings/userCalendars

// Week view hour range
const CAL_HOUR_START = 6;   // 6 AM
const CAL_HOUR_END   = 22;  // 10 PM
const CAL_SLOT_PX    = 44;  // px per hour

// ── Client color map ───────────────────────────────────
const CLIENT_COLOR_MAP = {
  blue: '#3B82F6', purple: '#8B5CF6', orange: '#F59E0B',
  green: '#10B981', cyan: '#06B6D4', red: '#EF4444',
};
function clientColorHex(cls) { return CLIENT_COLOR_MAP[cls] || '#3B82F6'; }

// ── Federal deadlines definition ───────────────────────
const FEDERAL_DEADLINES_DEF = [
  { month: 0, day: 15, title: 'Q4 Estimated Tax Due' },
  { month: 2, day: 15, title: '1065 Partnership Return Due' },
  { month: 2, day: 15, title: '1120-S S-Corp Return Due' },
  { month: 3, day: 15, title: '1040 Individual Return Due' },
  { month: 3, day: 15, title: 'Q1 Estimated Tax Due' },
  { month: 5, day: 15, title: 'Q2 Estimated Tax Due' },
  { month: 8, day: 15, title: 'Q3 Estimated Tax Due' },
  { month: 8, day: 15, title: 'Extended 1065 / 1120-S Due' },
  { month: 9, day: 15, title: 'Extended 1040 Due' },
];

function adjustForHoliday(year, month, day) {
  let d = new Date(year, month, day);
  let dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  if (dow === 0) d.setDate(d.getDate() + 1);
  // Emancipation Day (DC, Apr 16) on Monday → push Apr 15 deadlines to Apr 17
  if (month === 3 && day === 15 && new Date(year, 3, 16).getDay() === 1)
    d.setDate(d.getDate() + 1);
  return d;
}

function calDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Seed federal deadlines once per year ───────────────
async function ensureFederalDeadlines(year) {
  try {
    let snap = await db.collection('calendarEvents')
      .where('type','==','federal')
      .where('calYear','==', year)
      .get();
    if (!snap.empty) return;
    let batch = db.batch();
    FEDERAL_DEADLINES_DEF.forEach(fd => {
      let adj     = adjustForHoliday(year, fd.month, fd.day);
      let dateStr = calDateStr(adj);
      let ref     = db.collection('calendarEvents').doc();
      batch.set(ref, {
        title: fd.title, date: dateStr, type: 'federal',
        calYear: year, color: '#EF4444', notes: '',
        allDay: true, startTime: null, endTime: null,
        isOverride: false, originalDate: dateStr,
        clientId: null, clientName: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
  } catch(e) { console.warn('Could not seed federal deadlines:', e.message); }
}

// ── Init ───────────────────────────────────────────────
async function initCalendar() {
  if (!calInitialized) {
    calInitialized = true;
    calCurrentDate = new Date();
    calMiniDate    = new Date();
  }
  // Render immediately with whatever is cached
  renderCategories();
  renderCalendar();
  renderMiniCalendar();
  // Load from Firestore in background
  try {
    let yr = new Date().getFullYear();
    await loadUserCalendars();
    renderCategories();
    await ensureFederalDeadlines(yr);
    await ensureFederalDeadlines(yr + 1);
    await loadCalendarEvents();
    renderCalendar();
    renderMiniCalendar();
  } catch(e) { console.warn('Calendar load error:', e.message); }
}

async function loadCalendarEvents() {
  let snap = await db.collection('calendarEvents').orderBy('date').get();
  calEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Category filter ────────────────────────────────────
function getFilteredEvents() {
  let showFed = document.getElementById('cat-federal')?.checked  ?? true;
  let showCli = document.getElementById('cat-client')?.checked   ?? true;
  let showPer = document.getElementById('cat-personal')?.checked ?? true;
  return calEvents.filter(e => {
    if (e.type === 'federal'  && !showFed) return false;
    if (e.type === 'client'   && !showCli) return false;
    if (e.type === 'personal' && !showPer) return false;
    if (userCalendars.some(c => c.id === e.type)) {
      let cb = document.getElementById(`cat-user-${e.type}`);
      if (cb && !cb.checked) return false;
    }
    return true;
  });
}

// ── Render dispatcher ──────────────────────────────────
function renderCalendar() {
  if (calView === 'month') renderMonthView();
  else                     renderWeekView();
  renderMiniCalendar();
}

// ── Month View ─────────────────────────────────────────
function renderMonthView() {
  let container = document.getElementById('cal-grid-container');
  if (!container) return;

  let year  = calCurrentDate.getFullYear();
  let month = calCurrentDate.getMonth();

  document.getElementById('cal-title').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' });

  let firstDow    = new Date(year, month, 1).getDay();
  let daysInMonth = new Date(year, month + 1, 0).getDate();
  let prevYear    = month === 0 ? year - 1 : year;
  let prevMonth   = month === 0 ? 11 : month - 1;
  let daysInPrev  = new Date(prevYear, prevMonth + 1, 0).getDate();
  let nextYear    = month === 11 ? year + 1 : year;
  let nextMonth   = month === 11 ? 0 : month + 1;
  let todayStr    = calDateStr(new Date());
  let visible     = getFilteredEvents();

  let html = '<div class="cal-month-grid">';

  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d =>
    html += `<div class="cal-month-dow">${d}</div>`
  );

  // Prev-month spillover
  for (let i = firstDow - 1; i >= 0; i--) {
    let d  = daysInPrev - i;
    let ds = `${prevYear}-${String(prevMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    html += `<div class="cal-month-cell cal-month-cell-dim" onclick="openDayDetail('${ds}')"><span class="cal-day-num">${d}</span></div>`;
  }

  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    let ds      = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    let isToday = ds === todayStr;
    let evts    = visible.filter(e => e.date === ds);
    let numHtml = isToday
      ? `<span class="cal-day-num cal-today-num">${day}</span>`
      : `<span class="cal-day-num">${day}</span>`;
    let evHtml  = evts.slice(0,3).map(e =>
      `<div class="cal-event-pill"
        style="background:${e.color}22;border-left:3px solid ${e.color};color:${e.color};"
        onclick="event.stopPropagation();openEditEventModal('${e.id}')"
        title="${esc(e.title)}">${esc(e.title)}</div>`
    ).join('');
    if (evts.length > 3)
      evHtml += `<div class="cal-event-more" onclick="event.stopPropagation();openDayDetail('${ds}')">+${evts.length-3} more</div>`;
    html += `<div class="cal-month-cell${isToday?' cal-today':''}" onclick="openDayDetail('${ds}')">
      ${numHtml}<div class="cal-cell-events">${evHtml}</div></div>`;
  }

  // Next-month spillover
  let used  = firstDow + daysInMonth;
  let total = Math.ceil(used / 7) * 7;
  for (let day = 1; day <= total - used; day++) {
    let ds = `${nextYear}-${String(nextMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    html += `<div class="cal-month-cell cal-month-cell-dim" onclick="openDayDetail('${ds}')"><span class="cal-day-num">${day}</span></div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ── Week View (hourly grid) ────────────────────────────
function renderWeekView() {
  let container = document.getElementById('cal-grid-container');
  if (!container) return;

  // Sunday of current week
  let start = new Date(calCurrentDate);
  start.setDate(calCurrentDate.getDate() - calCurrentDate.getDay());

  let end     = new Date(start); end.setDate(start.getDate() + 6);
  let fmtS    = start.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  let fmtE    = end.toLocaleDateString('en-US',   { month:'short', day:'numeric', year:'numeric' });
  document.getElementById('cal-title').textContent = `${fmtS} – ${fmtE}`;

  let todayStr = calDateStr(new Date());
  let visible  = getFilteredEvents();
  let days     = Array.from({ length:7 }, (_, i) => {
    let d = new Date(start); d.setDate(start.getDate() + i); return d;
  });

  // ── All-day section ──
  let allDayHeaderCols = days.map(d => {
    let ds      = calDateStr(d);
    let isToday = ds === todayStr;
    let dow     = d.toLocaleDateString('en-US', { weekday:'short' });
    let num     = d.getDate();
    let numHtml = isToday
      ? `<span class="cal-week-daynum cal-today-num">${num}</span>`
      : `<span class="cal-week-daynum">${num}</span>`;
    return `<div class="cal-week-day-header${isToday?' cal-today-col':''}" onclick="openDayDetail('${ds}')">
      <span class="cal-week-dow">${dow}</span>${numHtml}</div>`;
  }).join('');

  let allDayEventCols = days.map(d => {
    let ds   = calDateStr(d);
    let evts = visible.filter(e => e.date === ds && (e.allDay !== false || !e.startTime));
    let evHtml = evts.map(e =>
      `<div class="cal-week-allday-pill"
        style="background:${e.color}22;border-left:3px solid ${e.color};color:${e.color};"
        onclick="event.stopPropagation();openEditEventModal('${e.id}')">${esc(e.title)}</div>`
    ).join('');
    return `<div class="cal-week-allday-cell">${evHtml}</div>`;
  }).join('');

  // ── Timed events section ──
  let hourLabels = '';
  for (let h = CAL_HOUR_START; h < CAL_HOUR_END; h++) {
    let label = h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`;
    hourLabels += `<div class="cal-hour-label" style="height:${CAL_SLOT_PX}px;">${label}</div>`;
  }

  let timedCols = days.map(d => {
    let ds      = calDateStr(d);
    let isToday = ds === todayStr;
    let evts    = visible.filter(e => e.date === ds && e.allDay === false && e.startTime);

    // Current time indicator
    let nowHtml = '';
    if (isToday) {
      let now     = new Date();
      let elapsed = (now.getHours() - CAL_HOUR_START) * CAL_SLOT_PX + (now.getMinutes() / 60) * CAL_SLOT_PX;
      if (elapsed >= 0 && elapsed <= (CAL_HOUR_END - CAL_HOUR_START) * CAL_SLOT_PX)
        nowHtml = `<div class="cal-now-line" style="top:${elapsed}px;"></div>`;
    }

    // Place events
    let evHtml = evts.map(e => {
      let [sh, sm] = e.startTime.split(':').map(Number);
      let [eh, em] = (e.endTime || e.startTime).split(':').map(Number);
      let top    = (sh - CAL_HOUR_START) * CAL_SLOT_PX + (sm / 60) * CAL_SLOT_PX;
      let height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * CAL_SLOT_PX, CAL_SLOT_PX * 0.5);
      return `<div class="cal-timed-event"
        style="top:${top}px;height:${height}px;background:${e.color}22;border-left:3px solid ${e.color};color:${e.color};"
        onclick="event.stopPropagation();openEditEventModal('${e.id}')">${esc(e.title)}</div>`;
    }).join('');

    let totalH = (CAL_HOUR_END - CAL_HOUR_START) * CAL_SLOT_PX;
    return `<div class="cal-timed-col${isToday?' cal-today-col':''}" style="height:${totalH}px;"
      onclick="openDayDetail('${ds}')">${nowHtml}${evHtml}</div>`;
  }).join('');

  // Build hour slot row lines (background grid)
  let slotLines = '';
  for (let h = CAL_HOUR_START; h < CAL_HOUR_END; h++)
    slotLines += `<div class="cal-slot-line" style="top:${(h-CAL_HOUR_START)*CAL_SLOT_PX}px;"></div>`;

  container.innerHTML = `
    <div class="cal-week-wrap">
      <!-- Day headers + all-day row -->
      <div class="cal-week-top">
        <div class="cal-week-gutter"></div>
        <div class="cal-week-header-cols">${allDayHeaderCols}</div>
      </div>
      <div class="cal-week-allday-row">
        <div class="cal-week-gutter"><span class="cal-allday-label">all-day</span></div>
        <div class="cal-week-allday-cols">${allDayEventCols}</div>
      </div>
      <!-- Scrollable timed grid -->
      <div class="cal-week-scroll">
        <div class="cal-week-time-col">${hourLabels}</div>
        <div class="cal-week-timed-grid" style="min-height:${(CAL_HOUR_END-CAL_HOUR_START)*CAL_SLOT_PX}px;">
          ${slotLines}
          <div class="cal-week-timed-cols">${timedCols}</div>
        </div>
      </div>
    </div>`;
}

// ── Mini Calendar ──────────────────────────────────────
function renderMiniCalendar() {
  let el = document.getElementById('cal-mini-grid');
  if (!el) return;

  let year  = calMiniDate.getFullYear();
  let month = calMiniDate.getMonth();

  document.getElementById('cal-mini-title').textContent =
    new Date(year, month, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' });

  let firstDow    = new Date(year, month, 1).getDay();
  let daysInMonth = new Date(year, month + 1, 0).getDate();
  let todayStr    = calDateStr(new Date());
  let selStr      = calDateStr(calCurrentDate);

  let html = ['S','M','T','W','T','F','S'].map(d =>
    `<div class="cal-mini-dow">${d}</div>`
  ).join('');

  for (let i = 0; i < firstDow; i++) html += '<div class="cal-mini-cell"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    let ds      = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    let isToday = ds === todayStr;
    let isSel   = ds === selStr;
    let hasDot  = calEvents.some(e => e.date === ds);
    let cls     = 'cal-mini-cell';
    if (isToday) cls += ' cal-mini-today';
    if (isSel)   cls += ' cal-mini-selected';
    html += `<div class="${cls}" onclick="calMiniJump('${ds}')">${day}${(hasDot && !isSel) ? '<span class="cal-mini-dot"></span>' : ''}</div>`;
  }

  el.innerHTML = html;
}

// ── Navigation ─────────────────────────────────────────
function calPrev() {
  if (calView === 'month') calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
  else                     calCurrentDate.setDate(calCurrentDate.getDate() - 7);
  renderCalendar();
}
function calNext() {
  if (calView === 'month') calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
  else                     calCurrentDate.setDate(calCurrentDate.getDate() + 7);
  renderCalendar();
}
function calToday() {
  calCurrentDate = new Date(); calMiniDate = new Date();
  renderCalendar();
}
function calMiniPrev() { calMiniDate.setMonth(calMiniDate.getMonth() - 1); renderMiniCalendar(); }
function calMiniNext() { calMiniDate.setMonth(calMiniDate.getMonth() + 1); renderMiniCalendar(); }
function calMiniJump(ds) {
  calCurrentDate = new Date(ds + 'T12:00:00');
  calMiniDate    = new Date(ds + 'T12:00:00');
  renderCalendar();
}
function setCalView(view) {
  calView = view;
  document.getElementById('view-btn-month').classList.toggle('active', view === 'month');
  document.getElementById('view-btn-week').classList.toggle('active', view === 'week');
  renderCalendar();
}

// ── Panel collapse / expand ────────────────────────────
function toggleCalPanel() {
  let panel  = document.getElementById('cal-left-panel');
  let expand = document.getElementById('cal-panel-expand');
  let collapsed = panel.classList.toggle('cal-panel-collapsed');
  if (expand) expand.style.display = collapsed ? 'flex' : 'none';
}

// ── Day Detail ─────────────────────────────────────────
function openDayDetail(dateStr) {
  let panel  = document.getElementById('cal-day-detail');
  let evList = document.getElementById('cal-day-detail-events');
  if (!panel) return;

  let d = new Date(dateStr + 'T12:00:00');
  document.getElementById('cal-day-detail-title').textContent =
    d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  let evts = getFilteredEvents().filter(e => e.date === dateStr);
  let html = evts.length === 0
    ? '<div class="cal-day-no-events">No events this day.</div>'
    : evts.map(e => {
        let timeHtml = e.allDay === false && e.startTime
          ? `<div class="cal-day-event-time">${fmtTime(e.startTime)}${e.endTime ? ' – ' + fmtTime(e.endTime) : ''}</div>`
          : '';
        return `<div class="cal-day-event-item" onclick="openEditEventModal('${e.id}')">
          <div class="cal-day-event-color" style="background:${e.color};"></div>
          <div class="cal-day-event-info">
            <div class="cal-day-event-title">${esc(e.title)}</div>
            ${timeHtml}
            ${e.notes ? `<div class="cal-day-event-notes">${esc(e.notes)}</div>` : ''}
          </div></div>`;
      }).join('');

  html += `<button class="ghost-btn" style="margin-top:12px;width:100%;font-size:12px;"
    onclick="openAddEventModal('${dateStr}')">+ Add event on this day</button>`;

  evList.innerHTML = html;
  panel.style.display = 'flex';
}

function closeDayDetail() {
  let p = document.getElementById('cal-day-detail');
  if (p) p.style.display = 'none';
}

function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  let ampm = h >= 12 ? 'PM' : 'AM';
  let h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ── Add / Edit Event Modal ─────────────────────────────
function openAddEventModal(defaultDate) {
  editingEventId = null;
  populateCalClientSelect();
  document.getElementById('cal-modal-title').textContent     = 'Add Event';
  document.getElementById('cal-event-title').value           = '';
  document.getElementById('cal-event-date').value            = defaultDate || calDateStr(calCurrentDate);
  document.getElementById('cal-event-type').value            = 'client';
  document.getElementById('cal-event-notes').value           = '';
  document.getElementById('cal-event-color').value           = '#10B981';
  document.getElementById('cal-event-allday').checked        = true;
  document.getElementById('cal-event-start').value           = '09:00';
  document.getElementById('cal-event-end').value             = '10:00';
  document.getElementById('cal-delete-btn').style.display    = 'none';
  onEventTypeChange();
  onAllDayChange();
  document.getElementById('cal-modal-overlay').style.display = 'flex';
}

function openEditEventModal(eventId) {
  let ev = calEvents.find(e => e.id === eventId);
  if (!ev) return;
  editingEventId = eventId;
  populateCalClientSelect();
  document.getElementById('cal-modal-title').textContent  = 'Edit Event';
  document.getElementById('cal-event-title').value        = ev.title;
  document.getElementById('cal-event-date').value         = ev.date;
  document.getElementById('cal-event-type').value         = ev.type;
  document.getElementById('cal-event-notes').value        = ev.notes || '';
  document.getElementById('cal-event-color').value        = ev.color || '#10B981';
  document.getElementById('cal-event-allday').checked     = ev.allDay !== false;
  document.getElementById('cal-event-start').value        = ev.startTime || '09:00';
  document.getElementById('cal-event-end').value          = ev.endTime   || '10:00';
  document.getElementById('cal-delete-btn').style.display = ev.type === 'federal' ? 'none' : 'inline-flex';
  if (ev.clientId) document.getElementById('cal-event-client').value = ev.clientId;
  onEventTypeChange();
  onAllDayChange();
  document.getElementById('cal-modal-overlay').style.display = 'flex';
}

function closeEventModal() {
  document.getElementById('cal-modal-overlay').style.display = 'none';
  editingEventId = null;
}

function onAllDayChange() {
  let allDay  = document.getElementById('cal-event-allday').checked;
  let timeRow = document.getElementById('cal-time-row');
  if (timeRow) timeRow.style.display = allDay ? 'none' : 'flex';
}

function onEventTypeChange() {
  let type      = document.getElementById('cal-event-type').value;
  let clientSel = document.getElementById('cal-event-client');
  let colorRow  = document.getElementById('cal-color-row');
  let allDayRow = document.getElementById('cal-event-allday')?.closest('label');
  let isUserCal = userCalendars.some(c => c.id === type);
  if (clientSel) clientSel.style.display = type === 'client' ? 'block' : 'none';
  if (colorRow)  colorRow.style.display  = type === 'personal' ? 'flex' : 'none';
  if (type === 'federal') {
    document.getElementById('cal-event-allday').checked = true;
    onAllDayChange();
    if (allDayRow) { allDayRow.style.opacity = '0.4'; allDayRow.style.pointerEvents = 'none'; }
  } else {
    if (allDayRow) { allDayRow.style.opacity = ''; allDayRow.style.pointerEvents = ''; }
  }
  if (isUserCal) {
    let cal = userCalendars.find(c => c.id === type);
    if (cal) document.getElementById('cal-event-color').value = cal.color;
  }
}

function onClientEventSelect() {
  let uid = document.getElementById('cal-event-client').value;
  let cl  = (typeof clients !== 'undefined') ? clients.find(c => c.uid === uid) : null;
  if (cl?.color) document.getElementById('cal-event-color').value = clientColorHex(cl.color);
}

function populateCalClientSelect() {
  let sel = document.getElementById('cal-event-client');
  if (!sel) return;
  let cur = sel.value;
  sel.innerHTML = '<option value="">&#8212; Select Client &#8212;</option>';
  if (typeof clients !== 'undefined') {
    clients.forEach(c => {
      let name = c.name || `${c.firstName||''} ${c.lastName||''}`.trim();
      sel.innerHTML += `<option value="${c.uid}">${esc(name)}</option>`;
    });
  }
  if (cur) sel.value = cur;
}

async function saveCalEvent() {
  let title  = document.getElementById('cal-event-title').value.trim();
  let date   = document.getElementById('cal-event-date').value;
  let type   = document.getElementById('cal-event-type').value;
  let notes  = document.getElementById('cal-event-notes').value.trim();
  let allDay = document.getElementById('cal-event-allday').checked;
  let start  = allDay ? null : (document.getElementById('cal-event-start').value || null);
  let end    = allDay ? null : (document.getElementById('cal-event-end').value   || null);
  let color  = '#EF4444';

  if (!title) { toast('Please enter an event title.', 'error'); return; }
  if (!date)  { toast('Please select a date.',        'error'); return; }

  let clientId = null, clientName = null;

  if (type === 'client') {
    clientId = document.getElementById('cal-event-client').value;
    if (!clientId) { toast('Please select a client.', 'error'); return; }
    let cl     = (typeof clients !== 'undefined') ? clients.find(c => c.uid === clientId) : null;
    clientName = cl ? (cl.name || `${cl.firstName||''} ${cl.lastName||''}`.trim()) : '';
    color      = clientColorHex(cl?.color || 'blue');
  } else if (type === 'personal') {
    color = document.getElementById('cal-event-color').value;
  } else {
    let userCal = userCalendars.find(c => c.id === type);
    if (userCal) color = userCal.color;
  }

  let data = {
    title, date, type, color, notes,
    allDay, startTime: start, endTime: end,
    clientId, clientName,
    calYear: parseInt(date.substring(0,4)),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (editingEventId) {
      let upd = { title, date, notes, color, allDay, startTime: start, endTime: end };
      let ex  = calEvents.find(e => e.id === editingEventId);
      if (ex?.type === 'federal') { upd.isOverride = true; upd.originalDate = ex.originalDate || ex.date; }
      await db.collection('calendarEvents').doc(editingEventId).update(upd);
      toast('Event updated.', 'success');
    } else {
      data.isOverride = false; data.originalDate = null;
      await db.collection('calendarEvents').add(data);
      toast('Event added.', 'success');
    }
    closeEventModal(); closeDayDetail();
    await loadCalendarEvents();
    renderCalendar();
  } catch(e) {
    console.error('Save error:', e);
    toast('Failed to save event. Check that rules are deployed.', 'error');
  }
}

async function deleteCalEvent() {
  if (!editingEventId) return;
  try {
    await db.collection('calendarEvents').doc(editingEventId).delete();
    closeEventModal(); closeDayDetail();
    await loadCalendarEvents(); renderCalendar();
    toast('Event deleted.', 'success');
  } catch(e) { toast('Failed to delete event.', 'error'); }
}

// ── User Calendars ─────────────────────────────────────
async function loadUserCalendars() {
  try {
    let doc = await db.collection('settings').doc('userCalendars').get();
    userCalendars = doc.exists ? (doc.data().list || []) : [];
  } catch(e) { console.warn('Could not load user calendars:', e.message); }
}

function renderCategories() {
  let container = document.getElementById('cal-categories-list');
  if (!container) return;

  const builtIn = [
    { id: 'federal',  label: 'Federal Deadlines', color: '#EF4444' },
    { id: 'client',   label: 'Clients',            color: '#3B82F6' },
    { id: 'personal', label: 'Personal',           color: '#10B981' },
  ];

  let html = builtIn.map(c => `
    <label class="cal-cat-item">
      <input type="checkbox" id="cat-${c.id}" checked onchange="renderCalendar()">
      <span class="cal-cat-dot" style="background:${c.color};"></span>
      <span>${c.label}</span>
    </label>`).join('');

  userCalendars.forEach(c => {
    html += `
    <label class="cal-cat-item cal-cat-user">
      <input type="checkbox" id="cat-user-${c.id}" checked onchange="renderCalendar()">
      <span class="cal-cat-dot" style="background:${esc(c.color)};"></span>
      <span class="cal-cat-name">${esc(c.name)}</span>
      <button class="cal-cat-del" onclick="event.preventDefault();event.stopPropagation();deleteUserCalendar('${c.id}')" title="Remove">&#x2715;</button>
    </label>`;
  });

  container.innerHTML = html;
  syncEventTypeSelect();
}

function syncEventTypeSelect() {
  let sel = document.getElementById('cal-event-type');
  if (!sel) return;
  Array.from(sel.querySelectorAll('[data-user]')).forEach(o => o.remove());
  userCalendars.forEach(c => {
    let opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    opt.dataset.user = '1';
    sel.appendChild(opt);
  });
}

function openAddCalendarForm() {
  let form  = document.getElementById('cal-add-cal-form');
  let input = document.getElementById('cal-new-cal-name');
  if (!form) return;
  form.style.display = 'block';
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
}

function closeAddCalendarForm() {
  let form = document.getElementById('cal-add-cal-form');
  if (form) form.style.display = 'none';
}

async function confirmAddCalendar() {
  let name  = document.getElementById('cal-new-cal-name').value.trim();
  let color = document.getElementById('cal-new-cal-color').value;
  if (!name) { document.getElementById('cal-new-cal-name').focus(); return; }
  let newCal = { id: `user_${Date.now()}`, name, color };
  userCalendars.push(newCal);
  try {
    await db.collection('settings').doc('userCalendars').set({ list: userCalendars });
    closeAddCalendarForm();
    renderCategories();
    toast(`"${name}" added.`, 'success');
  } catch(e) {
    userCalendars.pop();
    toast('Failed to save calendar.', 'error');
  }
}

async function deleteUserCalendar(id) {
  let prev = [...userCalendars];
  userCalendars = userCalendars.filter(c => c.id !== id);
  try {
    await db.collection('settings').doc('userCalendars').set({ list: userCalendars });
    renderCategories();
    renderCalendar();
    toast('Calendar removed.', 'success');
  } catch(e) {
    userCalendars = prev;
    toast('Failed to remove calendar.', 'error');
  }
}

// ── Settings Modal ─────────────────────────────────────
function openSettingsModal() {
  db.collection('settings').doc('firm').get().then(doc => {
    if (doc.exists) {
      let d = doc.data();
      document.getElementById('settings-firm-name').value = d.firmName       || '';
      document.getElementById('settings-tax-year').value  = d.defaultTaxYear || '';
    }
  }).catch(() => {});
  document.getElementById('settings-modal-overlay').style.display = 'flex';
}
function closeSettingsModal() {
  document.getElementById('settings-modal-overlay').style.display = 'none';
}
async function saveSettings() {
  let firmName      = document.getElementById('settings-firm-name').value.trim();
  let defaultTaxYear = document.getElementById('settings-tax-year').value.trim();
  try {
    await db.collection('settings').doc('firm').set({ firmName, defaultTaxYear }, { merge: true });
    closeSettingsModal();
    toast('Settings saved.', 'success');
  } catch(e) { toast('Failed to save settings.', 'error'); }
}
