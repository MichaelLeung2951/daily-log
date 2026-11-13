/* ============================================================
   Daily Log — report.js
   Monthly overview · reads the same localStorage data
   ============================================================ */
'use strict';

const STORAGE_KEY = 'dailylog.entries.v1';
const THEME_KEY = 'dailylog.theme';

/* Shortcut definitions — must match app.js titles */
const MED_SHORTCUTS = [
  { title: 'Betaloc',                emoji: '💊', short: 'Betaloc' },
  { title: 'Olmesartan 20mg',        emoji: '💊', short: 'Olmesartan 20' },
  { title: 'Aspirin',                emoji: '💊', short: 'Aspirin' },
  { title: 'Statins',                emoji: '💊', short: 'Statins' },
  { title: 'Olmesartan 10mg (half)', emoji: '💊', short: 'Olm 10 (½)' },
];

const CAT_STYLES = {
  Work:     { label: '💼 Work',     bar: 'bg-blue-500' },
  Personal: { label: '🏠 Personal', bar: 'bg-amber-500' },
  Health:   { label: '💪 Health',   bar: 'bg-emerald-500' },
  Study:    { label: '📚 Study',    bar: 'bg-violet-500' },
  Other:    { label: '📌 Other',    bar: 'bg-slate-400' },
};

const $ = (id) => document.getElementById(id);

/* ---------- State ---------- */
let entries = loadEntries();
let viewMonth = toDateStr(new Date()).slice(0, 7); // YYYY-MM

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function durationMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function monthDays(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function daysElapsedInMonth(ym) {
  const today = new Date();
  const ymNow = toDateStr(today).slice(0, 7);
  if (ym < ymNow) return monthDays(ym);
  if (ym > ymNow) return 0;
  return today.getDate();
}

function monthEntries() {
  return entries.filter(e => typeof e.date === 'string' && e.date.startsWith(viewMonth));
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

/* ---------- Month navigation ---------- */
function shiftMonth(delta) {
  const [y, m] = viewMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  render();
}

/* ---------- Render ---------- */
function render() {
  $('monthLabel').textContent = new Date(
    Number(viewMonth.slice(0, 4)), Number(viewMonth.slice(5, 7)) - 1, 1
  ).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const list = monthEntries();
  const totalMins = list.reduce((s, e) => s + durationMinutes(e.start, e.end), 0);

  // Summary cards
  $('statCount').textContent = list.length;
  $('statTime').textContent = formatDuration(totalMins);

  const perDay = {};
  for (const e of list) perDay[e.date] = (perDay[e.date] || 0) + 1;
  const activeDays = Object.keys(perDay).length;
  $('statDays').textContent = `${activeDays}/${monthDays(viewMonth)}`;

  let busyDay = null, busyCount = 0;
  for (const [d, c] of Object.entries(perDay)) {
    if (c > busyCount) { busyCount = c; busyDay = d; }
  }
  $('statBusy').textContent = busyDay
    ? `${Number(busyDay.slice(8, 10))} (${busyCount})`
    : '–';

  renderDailyChart(list, perDay);
  renderCategories(list, totalMins);
  renderMedAdherence(list);
  renderHighlights(list);
}

function renderDailyChart(list, perDay) {
  const days = monthDays(viewMonth);
  const wrap = $('dailyChart');
  const axis = $('dailyAxis');
  wrap.innerHTML = '';
  const maxCount = Math.max(1, ...Object.values(perDay));
  const elapsed = daysElapsedInMonth(viewMonth);

  for (let d = 1; d <= days; d++) {
    const dateStr = `${viewMonth}-${String(d).padStart(2, '0')}`;
    const count = perDay[dateStr] || 0;
    const bar = document.createElement('div');
    const hPct = count === 0 ? 0 : Math.max(8, Math.round((count / maxCount) * 100));
    bar.className = 'flex-1 flex flex-col justify-end h-full rounded-t';
    bar.innerHTML = `<div class="rounded-t ${count === 0 ? 'bg-slate-200 dark:bg-slate-700' : d > elapsed ? 'bg-indigo-300 dark:bg-indigo-700' : 'bg-indigo-500'}" style="height:${hPct}%" title="${d}: ${count} ${count === 1 ? 'activity' : 'activities'}"></div>`;
    wrap.appendChild(bar);
  }
  axis.innerHTML = `<span>1</span><span>${Math.round(days / 2)}</span><span>${days}</span>`;
}

function renderCategories(list, totalMins) {
  const wrap = $('catBreakdown');
  wrap.innerHTML = '';
  const byCat = {};
  for (const e of list) {
    const cat = e.category in CAT_STYLES ? e.category : 'Other';
    byCat[cat] = byCat[cat] || { count: 0, mins: 0 };
    byCat[cat].count++;
    byCat[cat].mins += durationMinutes(e.start, e.end);
  }
  const cats = Object.entries(byCat).sort((a, b) => b[1].count - a[1].count);

  if (cats.length === 0) {
    wrap.innerHTML = '<p class="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No activities logged this month yet.</p>';
    return;
  }

  for (const [cat, { count, mins }] of cats) {
    const pct = list.length ? Math.round((count / list.length) * 100) : 0;
    const style = CAT_STYLES[cat];
    const row = document.createElement('div');
    row.innerHTML = `
      <div class="flex items-baseline justify-between text-sm mb-1">
        <span class="font-medium">${style.label}</span>
        <span class="text-slate-500 dark:text-slate-400">${count} · ${formatDuration(mins)} · ${pct}%</span>
      </div>
      <div class="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div class="h-full rounded-full ${style.bar}" style="width:${pct}%"></div>
      </div>`;
    wrap.appendChild(row);
  }
}

function medTitle(med) { return `${med.emoji} ${med.title}`; }

function renderMedAdherence(list) {
  const wrap = $('medAdherence');
  wrap.innerHTML = '';
  const days = monthDays(viewMonth);
  const elapsed = daysElapsedInMonth(viewMonth);
  const takenByDay = {};
  for (const e of list) {
    for (const med of MED_SHORTCUTS) {
      if (e.title === medTitle(med)) {
        const d = Number(e.date.slice(8, 10));
        takenByDay[med.title] = takenByDay[med.title] || new Set();
        takenByDay[med.title].add(d);
      }
    }
  }

  for (const med of MED_SHORTCUTS) {
    const taken = takenByDay[med.title] || new Set();
    const rate = elapsed ? Math.round((taken.size / elapsed) * 100) : 0;
    const row = document.createElement('div');
    let dots = '';
    for (let d = 1; d <= days; d++) {
      let cls;
      if (d > elapsed) cls = 'bg-slate-100 dark:bg-slate-700/50';
      else if (taken.has(d)) cls = 'bg-emerald-500';
      else cls = 'bg-slate-300 dark:bg-slate-600';
      dots += `<span class="w-3.5 h-3.5 rounded-full ${cls}" title="${med.short} · day ${d}${taken.has(d) ? ' ✓' : ''}"></span>`;
    }
    row.innerHTML = `
      <div class="flex items-baseline justify-between text-sm mb-1.5">
        <span class="font-medium">${med.short}</span>
        <span class="${rate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'} font-semibold">${taken.size}/${elapsed} · ${rate}%</span>
      </div>
      <div class="flex flex-wrap gap-1">${dots}</div>`;
    wrap.appendChild(row);
  }
}

function countTitle(list, title) {
  return list.filter(e => e.title === title).length;
}

function renderHighlights(list) {
  const wrap = $('highlights');
  wrap.innerHTML = '';
  const items = [
    { emoji: '🍽️', label: 'Dinner · Wife',      value: countTitle(list, '🍽️ Outside dinner with Wife') },
    { emoji: '🍽️', label: 'Dinner · Family',    value: countTitle(list, '🍽️ Outside dinner with Family') },
    { emoji: '🍽️', label: 'Dinner · Friends',   value: countTitle(list, '🍽️ Outside dinner with Friends') },
    { emoji: '🏓', label: 'Table tennis · Friends', value: countTitle(list, '🏓 Playing table tennis with Friends') },
    { emoji: '🏓', label: 'Table tennis · Coach',   value: countTitle(list, '🏓 Playing table tennis with Coach') },
    { emoji: '🏓', label: 'Table tennis · Tsuen Waner', value: countTitle(list, '🏓 Playing table tennis with Tsuen Waner') },
    { emoji: '🏢', label: 'Back to office',     value: countTitle(list, '🏢 Back to office') },
    { emoji: '👋', label: 'Leaving office',     value: countTitle(list, '👋 Leaving office') },
    { emoji: '🏊', label: 'Swimming',           value: countTitle(list, '🏊 Swimming') },
  ];
  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'rounded-xl bg-slate-100 dark:bg-slate-700 p-3 text-center';
    card.innerHTML = `
      <p class="text-xl">${it.emoji}</p>
      <p class="text-2xl font-bold mt-0.5">${it.value}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">${it.label}</p>`;
    wrap.appendChild(card);
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  $('prevMonth').addEventListener('click', () => shiftMonth(-1));
  $('nextMonth').addEventListener('click', () => shiftMonth(1));
  render();
});
