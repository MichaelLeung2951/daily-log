/* ============================================================
   Daily Log — app.js
   Vanilla JS · localStorage persistence · no dependencies
   ============================================================ */
'use strict';

const STORAGE_KEY = 'dailylog.entries.v1';
const THEME_KEY = 'dailylog.theme';

const CATEGORIES = {
  Work:     { emoji: '💼', dot: 'bg-blue-500',    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  Personal: { emoji: '🏠', dot: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  Health:   { emoji: '💪', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  Study:    { emoji: '📚', dot: 'bg-violet-500',  chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' },
  Other:    { emoji: '📌', dot: 'bg-slate-400',   chip: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

/* ---------- State ---------- */
let entries = loadEntries();
let currentDate = toDateStr(new Date());
let editingId = null;

/* ---------- Helpers ---------- */
function $(id) { return document.getElementById(id); }

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeStr(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function nowTimeStr() { return toTimeStr(new Date()); }

function isValidDateStr(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function isValidTimeStr(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }

function durationMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight activity (equal times = 0m)
  return mins;
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const tomorrow = toDateStr(new Date(Date.now() + 86400000));
  const label = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (dateStr === today) return `${label} · Today`;
  if (dateStr === yesterday) return `${label} · Yesterday`;
  if (dateStr === tomorrow) return `${label} · Tomorrow`;
  return label;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------- Persistence ---------- */
function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(e => e && typeof e === 'object') : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('opacity-0'), 2200);
}

/* ---------- Theme ---------- */
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  $('iconSun').classList.toggle('hidden', dark);
  $('iconMoon').classList.toggle('hidden', !dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#1e1b4b' : '#4f46e5';
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored ? stored === 'dark' : prefersDark);
  $('themeToggle').addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    applyTheme(dark);
  });
}

/* ---------- Date navigation ---------- */
function shiftDate(days) {
  const [y, m, d] = currentDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  currentDate = toDateStr(date);
  render();
}

function initDateNav() {
  $('prevDay').addEventListener('click', () => shiftDate(-1));
  $('nextDay').addEventListener('click', () => shiftDate(1));
  $('todayBtn').addEventListener('click', () => {
    currentDate = toDateStr(new Date());
    render();
  });
  $('datePicker').addEventListener('change', (e) => {
    if (e.target.value) {
      currentDate = e.target.value;
      render();
    }
  });
}

/* ---------- Form ---------- */
function resetForm() {
  editingId = null;
  $('entryForm').reset();
  $('entryId').value = '';
  $('startTime').value = nowTimeStr();
  $('endTime').value = nowTimeStr();
  $('formHeading').textContent = 'New Activity';
  $('submitBtn').textContent = 'Add Activity';
  $('cancelEditBtn').classList.add('hidden');
}

function startEdit(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  // Jump the view to the entry's date so context matches
  currentDate = entry.date;
  $('entryId').value = entry.id;
  $('title').value = entry.title;
  $('category').value = entry.category in CATEGORIES ? entry.category : 'Other';
  $('startTime').value = entry.start;
  $('endTime').value = entry.end;
  $('notes').value = entry.notes || '';
  $('formHeading').textContent = 'Edit Activity';
  $('submitBtn').textContent = 'Update Activity';
  $('cancelEditBtn').classList.remove('hidden');
  render();
  $('entryForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('title').focus();
}

function initForm() {
  resetForm();

  $('entryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('title').value.trim();
    const start = $('startTime').value;
    const end = $('endTime').value;

    if (!title) { toast('Please enter an activity title'); return; }
    if (!isValidTimeStr(start) || !isValidTimeStr(end)) { toast('Please set valid start/end times'); return; }

    const data = {
      title,
      category: $('category').value,
      start,
      end,
      notes: $('notes').value.trim(),
    };

    if (editingId) {
      const idx = entries.findIndex(e => e.id === editingId);
      if (idx !== -1) {
        entries[idx] = { ...entries[idx], ...data, updatedAt: new Date().toISOString() };
      }
      toast('Activity updated ✓');
    } else {
      entries.push({
        id: (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        date: currentDate,
        ...data,
        createdAt: new Date().toISOString(),
      });
      toast('Activity added ✓');
    }

    saveEntries();
    resetForm();
    render();
  });

  $('cancelEditBtn').addEventListener('click', () => {
    resetForm();
    render();
  });
}

/* ---------- Timeline rendering ---------- */
function render() {
  renderMedShortcuts();
  renderDinnerShortcuts();
  renderTennisShortcuts();
  renderOfficeShortcuts();
  renderSwimmingShortcuts();
  $('datePicker').value = currentDate;
  $('dateLabel').textContent = formatDisplayDate(currentDate);

  const dayEntries = entries
    .filter(e => e.date === currentDate)
    .sort((a, b) => a.start.localeCompare(b.start) || String(a.createdAt).localeCompare(String(b.createdAt)));

  const timeline = $('timeline');
  timeline.innerHTML = '';

  if (dayEntries.length === 0) {
    timeline.innerHTML = `
      <div class="text-center py-10 text-slate-400 dark:text-slate-500">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
        <p class="text-sm">No activities logged for this day.</p>
        <p class="text-xs mt-1">Add one using the form above.</p>
      </div>`;
    $('dayTotal').textContent = '';
    return;
  }

  let total = 0;
  for (const entry of dayEntries) {
    total += durationMinutes(entry.start, entry.end);
    timeline.appendChild(createCard(entry));
  }
  $('dayTotal').textContent = `${dayEntries.length} ${dayEntries.length === 1 ? 'activity' : 'activities'} · ${formatDuration(total)} total`;
}

function createCard(entry) {
  const cat = CATEGORIES[entry.category] || CATEGORIES.Other;
  const mins = durationMinutes(entry.start, entry.end);
  const overnight = entry.end < entry.start;

  const card = document.createElement('article');
  card.className = 'bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 flex gap-3 relative';

  card.innerHTML = `
    <div class="flex flex-col items-center pt-0.5 shrink-0">
      <span class="w-3 h-3 rounded-full ${cat.dot} mt-1.5"></span>
      <span class="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1"></span>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-semibold leading-snug break-words">${escapeHtml(entry.title)}</h3>
        <span class="shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${cat.chip}">${cat.emoji} ${escapeHtml(entry.category)}</span>
      </div>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
        ${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}${overnight ? ' <span class="text-[10px] font-semibold text-indigo-500">(+1d)</span>' : ''}
        <span class="mx-1.5">·</span>
        <span class="font-semibold text-indigo-600 dark:text-indigo-400">${formatDuration(mins)}</span>
      </p>
      ${entry.notes ? `<p class="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap break-words">${escapeHtml(entry.notes)}</p>` : ''}
      <div class="flex gap-2 mt-3 -mb-1">
        <button data-action="edit" data-id="${entry.id}" class="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 py-2.5 min-h-[44px] hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
          Edit
        </button>
        <button data-action="delete" data-id="${entry.id}" class="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 py-2.5 min-h-[44px] hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          Delete
        </button>
      </div>
    </div>`;

  return card;
}

// Event delegation for edit/delete
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'edit') {
    startEdit(id);
  } else if (action === 'delete') {
    const entry = entries.find(x => x.id === id);
    if (!entry) return;
    if (!confirm(`Delete "${entry.title}"?`)) return;
    entries = entries.filter(x => x.id !== id);
    if (editingId === id) resetForm();
    saveEntries();
    render();
    toast('Activity deleted');
  }
});

/* ---------- Medication shortcuts (one-tap) ---------- */
const MED_SHORTCUTS = [
  { title: 'Betaloc',               emoji: '💊', short: 'Betaloc' },
  { title: 'Olmesartan 20mg',       emoji: '💊', short: 'Olmesartan 20' },
  { title: 'Aspirin',               emoji: '💊', short: 'Aspirin' },
  { title: 'Statins',               emoji: '💊', short: 'Statins' },
  { title: 'Olmesartan 10mg (half)', emoji: '💊', short: 'Olm 10 (½)' },
];

/* ---------- Outside dinner shortcuts (one-tap) ---------- */
const DINNER_SHORTCUTS = [
  { title: 'Outside dinner with Wife',   emoji: '🍽️', short: 'Wife',    category: 'Personal' },
  { title: 'Outside dinner with Family', emoji: '🍽️', short: 'Family',  category: 'Personal' },
  { title: 'Outside dinner with Friends', emoji: '🍽️', short: 'Friends', category: 'Personal' },
];

/* ---------- Table tennis shortcuts (one-tap) ---------- */
const TENNIS_SHORTCUTS = [
  { title: 'Playing table tennis with Friends',  emoji: '🏓', short: 'Friends',    category: 'Health' },
  { title: 'Playing table tennis with Coach',    emoji: '🏓', short: 'Coach',      category: 'Health' },
  { title: 'Playing table tennis with Tsuen Waner', emoji: '🏓', short: 'Tsuen Waner', category: 'Health' },
];

/* ---------- Office check-in/out shortcuts (one-tap) ---------- */
const OFFICE_SHORTCUTS = [
  { title: 'Back to office',  emoji: '🏢', short: 'Back to office',  category: 'Work' },
  { title: 'Leaving office',  emoji: '👋', short: 'Leaving office',  category: 'Work' },
];

/* ---------- Swimming shortcut (one-tap) ---------- */
const SWIMMING_SHORTCUTS = [
  { title: 'Swimming', emoji: '🏊', short: 'Swimming', category: 'Health' },
];

function medTaken(med) {
  return entries.some(e => e.date === currentDate && e.title === `${med.emoji} ${med.title}`);
}

function medRemaining() {
  return MED_SHORTCUTS.filter(m => !medTaken(m));
}

function addQuickEntry(shortcut, { dedupe = false } = {}) {
  if (dedupe && medTaken(shortcut)) {
    toast(`${shortcut.short} already recorded for this day ✓`);
    return;
  }
  const t = nowTimeStr();
  entries.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    date: currentDate,
    title: `${shortcut.emoji} ${shortcut.title}`,
    category: shortcut.category || 'Health',
    start: t,
    end: t,
    notes: '',
    createdAt: new Date().toISOString(),
  });
  saveEntries();
  render();
  toast(`${shortcut.short} recorded ✓`);
}

function addMedication(shortcut) {
  addQuickEntry(shortcut, { dedupe: true });
}

function renderMedShortcuts() {
  const wrap = $('medShortcuts');
  wrap.innerHTML = '';
  for (const med of MED_SHORTCUTS) {
    const taken = medTaken(med);
    const btn = document.createElement('button');
    btn.type = 'button';
    if (taken) {
      // Highlighted "taken" state: green with a checkmark
      btn.className = 'relative flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 border-2 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:bg-emerald-200 dark:active:bg-emerald-800/70 py-3 px-1 min-h-[64px] text-xs font-semibold leading-tight';
      btn.innerHTML = `
        <span class="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        <span class="text-xl leading-none">✔️</span>
        <span class="break-words text-center line-through opacity-80">${escapeHtml(med.short)}</span>`;
      btn.setAttribute('aria-label', `${med.title} already recorded`);
    } else {
      btn.className = 'flex flex-col items-center justify-center gap-1 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:bg-rose-200 dark:active:bg-rose-800/60 py-3 px-1 min-h-[64px] text-xs font-semibold leading-tight';
      btn.innerHTML = `<span class="text-xl leading-none">${med.emoji}</span><span class="break-words text-center">${escapeHtml(med.short)}</span>`;
      btn.setAttribute('aria-label', `Record ${med.title}`);
    }
    btn.addEventListener('click', () => addMedication(med));
    wrap.appendChild(btn);
  }
  renderMedStatus();
}

function renderMedStatus() {
  const el = $('medStatus');
  const remaining = medRemaining();
  if (remaining.length === 0) {
    el.className = 'mt-3 text-xs font-semibold rounded-lg px-3 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300';
    el.textContent = `✅ All ${MED_SHORTCUTS.length} medicines recorded for this day — well done!`;
  } else {
    el.className = 'mt-3 text-xs font-semibold rounded-lg px-3 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300';
    el.textContent = `⚠️ ${MED_SHORTCUTS.length - remaining.length}/${MED_SHORTCUTS.length} taken — still missing: ${remaining.map(m => m.short).join(', ')}`;
  }
}

/* ---------- Outside dinner shortcuts rendering ---------- */
function renderDinnerShortcuts() {
  const wrap = $('dinnerShortcuts');
  wrap.innerHTML = '';
  for (const dinner of DINNER_SHORTCUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex flex-col items-center justify-center gap-1 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/60 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 active:bg-orange-200 dark:active:bg-orange-800/60 py-3 px-1 min-h-[64px] text-xs font-semibold leading-tight';
    btn.innerHTML = `<span class="text-xl leading-none">${dinner.emoji}</span><span class="break-words text-center">${escapeHtml(dinner.short)}</span>`;
    btn.setAttribute('aria-label', `Record ${dinner.title}`);
    btn.addEventListener('click', () => addQuickEntry(dinner));
    wrap.appendChild(btn);
  }
}

/* ---------- Table tennis shortcuts rendering ---------- */
function renderTennisShortcuts() {
  const wrap = $('tennisShortcuts');
  wrap.innerHTML = '';
  for (const tennis of TENNIS_SHORTCUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex flex-col items-center justify-center gap-1 rounded-xl bg-lime-50 dark:bg-lime-900/30 border border-lime-200 dark:border-lime-800/60 text-lime-700 dark:text-lime-300 hover:bg-lime-100 dark:hover:bg-lime-900/50 active:bg-lime-200 dark:active:bg-lime-800/60 py-3 px-1 min-h-[64px] text-xs font-semibold leading-tight';
    btn.innerHTML = `<span class="text-xl leading-none">🏓</span><span class="break-words text-center">${escapeHtml(tennis.short)}</span>`;
    btn.setAttribute('aria-label', `Record ${tennis.title}`);
    btn.addEventListener('click', () => addQuickEntry(tennis));
    wrap.appendChild(btn);
  }
}

/* ---------- Office shortcuts rendering ---------- */
function renderOfficeShortcuts() {
  const wrap = $('officeShortcuts');
  wrap.innerHTML = '';
  for (const office of OFFICE_SHORTCUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex flex-col items-center justify-center gap-1 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 active:bg-sky-200 dark:active:bg-sky-800/60 py-3 px-1 min-h-[64px] text-xs font-semibold leading-tight';
    btn.innerHTML = `<span class="text-xl leading-none">${office.emoji}</span><span class="break-words text-center">${escapeHtml(office.short)}</span>`;
    btn.setAttribute('aria-label', `Record ${office.title}`);
    btn.addEventListener('click', () => addQuickEntry(office));
    wrap.appendChild(btn);
  }
}

/* ---------- Swimming shortcut rendering ---------- */
function renderSwimmingShortcuts() {
  const wrap = $('swimmingShortcuts');
  wrap.innerHTML = '';
  for (const swim of SWIMMING_SHORTCUTS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'flex items-center justify-center gap-2 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 active:bg-cyan-200 dark:active:bg-cyan-800/60 py-3 px-2 min-h-[56px] text-sm font-semibold';
    btn.innerHTML = `<span class="text-xl leading-none">🏊</span><span>${escapeHtml(swim.short)}</span>`;
    btn.setAttribute('aria-label', `Record ${swim.title}`);
    btn.addEventListener('click', () => addQuickEntry(swim));
    wrap.appendChild(btn);
  }
}

/* ---------- Export / Import ---------- */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJSON() {
  if (entries.length === 0) { toast('Nothing to export yet'); return; }
  const payload = { app: 'Daily Log', version: 1, exportedAt: new Date().toISOString(), entries };
  downloadFile(`daily-log-backup-${toDateStr(new Date())}.json`, JSON.stringify(payload, null, 2), 'application/json');
  toast(`Exported ${entries.length} entries ✓`);
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV() {
  if (entries.length === 0) { toast('Nothing to export yet'); return; }
  const header = ['date', 'title', 'category', 'start', 'end', 'duration_minutes', 'notes'];
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .map(e => [e.date, e.title, e.category, e.start, e.end, durationMinutes(e.start, e.end), e.notes || ''].map(csvEscape).join(','));
  downloadFile(`daily-log-${toDateStr(new Date())}.csv`, '\uFEFF' + [header.join(','), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
  toast(`Exported ${entries.length} entries ✓`);
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title || !isValidDateStr(raw.date) || !isValidTimeStr(raw.start) || !isValidTimeStr(raw.end)) return null;
  return {
    id: (typeof raw.id === 'string' && raw.id) || (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    date: raw.date,
    title,
    category: raw.category in CATEGORIES ? raw.category : 'Other',
    start: raw.start,
    end: raw.end,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || null,
  };
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : null;
      if (!list) throw new Error('Unrecognized format');

      const existingIds = new Set(entries.map(e => e.id));
      let added = 0, skipped = 0;
      for (const raw of list) {
        const entry = normalizeEntry(raw);
        if (!entry) { skipped++; continue; }
        if (existingIds.has(entry.id)) { skipped++; continue; } // skip duplicates
        entries.push(entry);
        existingIds.add(entry.id);
        added++;
      }
      saveEntries();
      render();
      toast(`Imported ${added} new${skipped ? ` · ${skipped} skipped` : ''} ✓`);
    } catch {
      toast('Import failed — invalid JSON file');
    }
  };
  reader.onerror = () => toast('Import failed — could not read file');
  reader.readAsText(file);
}

function initBackup() {
  $('exportJsonBtn').addEventListener('click', exportJSON);
  $('exportCsvBtn').addEventListener('click', exportCSV);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importJSON(file);
    e.target.value = ''; // allow re-selecting the same file
  });
}

/* ---------- Service Worker ---------- */
function initSW() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline caching unavailable */ });
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Deep link support: index.html?date=YYYY-MM-DD
  const paramDate = new URLSearchParams(location.search).get('date');
  if (paramDate && isValidDateStr(paramDate)) currentDate = paramDate;

  initTheme();
  initDateNav();
  initForm();
  initBackup();
  initSW();
  render();

  // Opening reminder: alert about medicines not yet taken today
  if (currentDate === toDateStr(new Date()) && medRemaining().length > 0) {
    setTimeout(() => {
      const names = medRemaining().map(m => m.short).join(', ');
      toast(`💊 Reminder: ${medRemaining().length} medicine(s) not taken today — ${names}`);
    }, 600);
  }
});
