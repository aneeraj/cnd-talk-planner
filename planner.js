/* Talk Planner — Cloud Native Denmark 2026.
   Selections are persisted in localStorage (key cnd2026-plan-v1). */
'use strict';

const OFFICIAL = 'https://cloudnativedenmark.dk';
const LS_KEY = 'cnd2026-plan-v1';
const ROOM_ORDER = ['Main stage', 'Breakout', 'Workshop'];

/* ---------------- data prep ---------------- */

const DAYS = SCHEDULE_DATA.map((d, i) => {
  const date = new Date(d.date);
  return {
    index: i,
    label: 'Day ' + (i + 1),
    dateLabel: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    sessions: d.sessions.map(s => ({ ...s, day: i }))
  };
});
const ALL = DAYS.flatMap(d => d.sessions);
const BY_ID = new Map(ALL.map(s => [String(s.id), s]));

/* Same slug rules the official site uses, so deep links match. */
const slug = s => s.toLowerCase()
  .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const officialUrl = s =>
  `${OFFICIAL}/schedule/talk/${s.format ? slug(s.format) : 'talk'}-${slug(s.title) || 'talk'}-${s.id}/`;

const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const hhmm = t => t.slice(11, 16);
const durationMin = s => (new Date(s.endsAt) - new Date(s.startsAt)) / 60000;
const durLabel = s => { const m = durationMin(s); return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : m + 'm'; };
const fmtLabel = s => s.format || 'Plenary';
const svcIcon = t => /registration|breakfast/i.test(t) ? '🎟️' : /coffee/i.test(t) ? '☕' : /lunch/i.test(t) ? '🍽️' : /end|wrap|close/i.test(t) ? '🏁' : '📌';

/* Light markdown-ish rendering, like the official site: paragraphs + bullet lists. */
function renderDesc(text) {
  const out = [];
  let list = null, para = [];
  const flush = () => {
    if (para.length) { out.push(`<p>${para.join('<br/>')}</p>`); para = []; }
    if (list) { out.push(`<ul>${list.map(li => `<li>${li}</li>`).join('')}</ul>`); list = null; }
  };
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/^[-*•]\s+(.*)$/);
    if (m) { if (para.length) { out.push(`<p>${para.join('<br/>')}</p>`); para = []; } list = list || []; list.push(esc(m[1])); }
    else { flush(); para.push(esc(line)); }
  });
  flush();
  return out.join('');
}

/* ---------------- state ---------------- */

const state = { day: 0, room: 'all', q: '', picksOnly: false, showBreaks: true, detailed: false };
let selected = loadPlan();
const expanded = new Set();

function loadPlan() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY));
    if (raw && Array.isArray(raw.ids)) {
      if (raw.view === 'detailed') state.detailed = true; // remembered view preference
      return new Set(raw.ids.map(String));
    }
  } catch (e) { /* corrupted or unavailable */ }
  return new Set();
}
function savePlan() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      ids: [...selected],
      view: state.detailed ? 'detailed' : 'compact',
      savedAt: new Date().toISOString()
    }));
    return true;
  } catch (e) { return false; }
}

/* ---------------- rendering ---------------- */

const $ = id => document.getElementById(id);

function renderTabs() {
  $('dayTabs').innerHTML = DAYS.map(d => {
    const n = d.sessions.filter(s => !s.isService && selected.has(String(s.id))).length;
    return `<button class="tab ${state.day === d.index ? 'active' : ''}" role="tab"
      data-action="day" data-day="${d.index}" aria-selected="${state.day === d.index}">
      <span class="lbl-full">${d.label} · ${d.dateLabel}</span>
      <span class="lbl-min">${d.label}</span>
      <span class="cnt" data-zero="${n ? 0 : 1}">${n || '·'}</span>
    </button>`;
  }).join('');
  const d = DAYS[state.day];
  $('dayDate').textContent = `${d.label} · ${d.dateLabel} 2026`;
}

/* One-line excerpt for detailed view: first meaningful (non-bullet) line. */
const excerpt = t => t.split('\n').map(l => l.trim()).find(l => l && !/^[-*•]/.test(l)) || '';

function renderChips() {
  const rooms = [['all', 'All rooms'], ...ROOM_ORDER.map(r => [r, r])];
  $('chips').innerHTML =
    rooms.map(([v, l]) => `<button class="chip ${state.room === v ? 'on' : ''}" data-action="room" data-room="${esc(v)}">${esc(l)}</button>`).join('') +
    `<span class="chip-sep"></span>` +
    `<button class="chip ${state.picksOnly ? 'on' : ''}" data-action="picksOnly">★ My picks only</button>` +
    `<button class="chip ${state.showBreaks ? 'on' : ''}" data-action="breaks">Breaks & meals</button>` +
    `<button class="chip ${state.detailed ? 'on' : ''}" data-action="view" title="Show a one-line excerpt of each talk">☰ Detailed view</button>`;
}

function visible(s) {
  if (s.isService) return state.showBreaks;
  if (state.picksOnly && !selected.has(String(s.id))) return false;
  if (state.room !== 'all' && s.room !== state.room) return false;
  if (state.q) {
    const hay = (s.title + ' ' + s.speakers.join(' ') + ' ' + s.tags.join(' ') + ' ' + s.room).toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}

function slotsForDay(di) {
  const list = DAYS[di].sessions.slice().sort((a, b) =>
    a.startsAt === b.startsAt
      ? (ROOM_ORDER.indexOf(a.room) - ROOM_ORDER.indexOf(b.room)) || a.endsAt.localeCompare(b.endsAt)
      : a.startsAt.localeCompare(b.startsAt));
  const slots = [];
  for (const s of list) {
    const key = s.startsAt + (s.isService ? '#svc' : '');
    if (!slots.length || slots[slots.length - 1].key !== key) slots.push({ key, items: [] });
    slots[slots.length - 1].items.push(s);
  }
  return slots;
}

function talkCard(s) {
  const id = String(s.id);
  const picked = selected.has(id);
  const open = expanded.has(id);
  return `
  <article class="talk ${picked ? 'picked' : ''}" data-id="${id}">
    <div class="talk-head">
      <span class="badge b-${slug(fmtLabel(s))}">${esc(fmtLabel(s))}</span>
      <span class="room-pill">${esc(s.room)}</span>
    </div>
    <h3>${esc(s.title)}</h3>
    ${s.speakers.length ? `<div class="speakers">${s.speakers.map(esc).join('<span>·</span>')}</div>` : ''}
    ${s.tags.length ? `<div class="tags">${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    ${state.detailed && !open && s.description ? `<p class="desc excerpt">${esc(excerpt(s.description))}</p>` : ''}
    ${s.description ? `<button class="more-btn" data-action="expand" data-id="${id}" aria-expanded="${open}">${open ? '▴ hide info' : '▾ more info'}</button>` : ''}
    ${open && s.description ? `<p class="desc">${renderDesc(s.description)}</p>` : ''}
    <div class="talk-foot">
      <span class="time-chip">${hhmm(s.startsAt)}<b>–</b>${hhmm(s.endsAt)} · ${durLabel(s)}</span>
      <button class="btn-pick" data-action="pick" data-id="${id}" aria-pressed="${picked}">
        ${picked
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> In my plan`
          : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> Add to plan`}
      </button>
      <a class="official" href="${officialUrl(s)}" target="_blank" rel="noreferrer">official ↗</a>
    </div>
  </article>`;
}

function renderSchedule() {
  const slots = slotsForDay(state.day).map(sl => ({ ...sl, items: sl.items.filter(visible) })).filter(sl => sl.items.length);
  if (!slots.length) {
    $('schedule').innerHTML = `<div class="empty"><b>Nothing matches.</b><br/>Try clearing the search or filters${state.picksOnly ? ' — or add some talks first' : ''}.</div>`;
    return;
  }
  $('schedule').innerHTML = slots.map(sl => {
    const svc = sl.items.filter(s => s.isService);
    const talks = sl.items.filter(s => !s.isService);
    return `<div class="slot">
      <div class="slot-time">${hhmm(sl.items[0].startsAt)}<small>${svc.length && !talks.length ? hhmm(svc[0].endsAt) : ''}</small></div>
      <div class="slot-cards">
        ${svc.map(s => `<div class="svc"><span>${svcIcon(s.title)}</span><span>${esc(s.title)}</span><span class="t">${hhmm(s.startsAt)}–${hhmm(s.endsAt)}</span></div>`).join('')}
        ${talks.map(talkCard).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ---------------- conflicts ---------------- */

const overlaps = (a, b) => a.day === b.day && a.startsAt < b.endsAt && b.startsAt < a.endsAt;

function conflictMap() {
  const picks = [...selected].map(id => BY_ID.get(id)).filter(Boolean);
  const map = new Map();
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++)
      if (overlaps(picks[i], picks[j])) {
        const a = String(picks[i].id), b = String(picks[j].id);
        map.set(a, [...(map.get(a) || []), picks[j]]);
        map.set(b, [...(map.get(b) || []), picks[i]]);
      }
  return map;
}

/* Unique pairs of overlapping picks, for the plan summary. */
function conflictPairs() {
  const picks = [...selected].map(id => BY_ID.get(id)).filter(Boolean)
    .sort((a, b) => a.day - b.day || a.startsAt.localeCompare(b.startsAt));
  const pairs = [];
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++)
      if (overlaps(picks[i], picks[j])) pairs.push([picks[i], picks[j]]);
  return pairs;
}

/* ---------------- plan drawer ---------------- */

function planText() {
  const picks = [...selected].map(id => BY_ID.get(id)).filter(Boolean);
  const lines = ['My plan — Cloud Native Denmark 2026', ''];
  DAYS.forEach(d => {
    const dayPicks = picks.filter(p => p.day === d.index).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (!dayPicks.length) return;
    lines.push(`${d.label} — ${d.dateLabel}`);
    dayPicks.forEach(p => lines.push(`• ${hhmm(p.startsAt)}–${hhmm(p.endsAt)} · ${p.room} · ${p.title}${p.speakers.length ? ` — ${p.speakers.join(', ')}` : ''}`));
    lines.push('');
  });
  return lines.join('\n').trim();
}

function renderPlan() {
  const n = selected.size;
  const cnt = $('planCount');
  cnt.textContent = n;
  cnt.classList.toggle('zero', !n);
  $('drawerCount').textContent = n;
  $('copyPlan').disabled = !n;
  $('clearPlan').disabled = !n;

  const body = $('planBody');
  if (!n) {
    body.innerHTML = `<div class="drawer-empty">No talks in your plan yet.<br/><br/>Star talks in the schedule and they'll show up here — and stay saved in this browser.</div>`;
    return;
  }

  const conflicts = conflictMap();
  const pairs = conflictPairs();
  const picks = [...selected].map(id => BY_ID.get(id)).filter(Boolean)
    .sort((a, b) => a.day - b.day || a.startsAt.localeCompare(b.startsAt));

  let html = '';
  if (pairs.length) {
    html += `<div class="conflict-note"><span>⚠️</span><span>Time clash — these picked talks run in parallel:<br/>${
      pairs.map(([a, b]) => `· “${esc(a.title)}” ↔ “${esc(b.title)}”`).join('<br/>')
    }</span></div>`;
  }
  let curDay = -1;
  picks.forEach(p => {
    if (p.day !== curDay) { curDay = p.day; html += `<div class="day-head">Day ${p.day + 1} · ${DAYS[p.day].dateLabel}</div>`; }
    const clash = conflicts.get(String(p.id));
    html += `<div class="pick ${clash ? 'warn' : ''}">
      <span class="tt">${hhmm(p.startsAt)}–${hhmm(p.endsAt)}</span>
      <span class="mid"><b>${clash ? '⚠️ ' : ''}${esc(p.title)}</b><small>${esc(p.room)}${p.speakers.length ? ' · ' + esc(p.speakers.join(', ')) : ''}</small></span>
      <button class="rm" data-action="remove" data-id="${p.id}" aria-label="Remove ${esc(p.title)}">✕</button>
    </div>`;
  });
  body.innerHTML = html;
}

/* ---------------- toast ---------------- */

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- persistence note ---------------- */

function updateSavedNote(ok) {
  const raw = localStorage.getItem(LS_KEY);
  let when = 'not saved yet';
  try { const p = JSON.parse(raw); if (p && p.savedAt) when = new Date(p.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) {}
  $('savedNote').textContent = ok === false
    ? '⚠ Could not write to localStorage — picks will not persist in this browser mode.'
    : `Saved in this browser (localStorage) · ${when}`;
}

/* ---------------- re-render ---------------- */

function renderAll() {
  renderTabs();
  renderChips();
  renderSchedule();
  renderPlan();
}

/* ---------------- events ---------------- */

function togglePick(id) {
  const s = BY_ID.get(id);
  if (!s) return;
  if (selected.has(id)) {
    selected.delete(id);
    toast(`Removed “${s.title.slice(0, 60)}${s.title.length > 60 ? '…' : ''}”`);
  } else {
    selected.add(id);
    const clash = [...selected].map(x => BY_ID.get(x)).filter(Boolean).some(o => o.id !== s.id && overlaps(o, s));
    toast(clash ? `Added — ⚠ heads up, it overlaps another pick` : `Added “${s.title.slice(0, 60)}${s.title.length > 60 ? '…' : ''}” to your plan`);
  }
  const ok = savePlan();
  updateSavedNote(ok);
  renderAll();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const act = el.dataset.action;
  if (act === 'pick' || act === 'remove') {
    e.preventDefault();
    togglePick(el.dataset.id);
  } else if (act === 'expand') {
    const id = el.dataset.id;
    expanded.has(id) ? expanded.delete(id) : expanded.add(id);
    renderSchedule();
  } else if (act === 'day') {
    state.day = +el.dataset.day;
    renderTabs(); renderSchedule();
  } else if (act === 'room') {
    state.room = el.dataset.room;
    renderChips(); renderSchedule();
  } else if (act === 'picksOnly') {
    state.picksOnly = !state.picksOnly;
    renderChips(); renderSchedule();
  } else if (act === 'breaks') {
    state.showBreaks = !state.showBreaks;
    renderChips(); renderSchedule();
  } else if (act === 'view') {
    state.detailed = !state.detailed;
    savePlan(); // remember the preference like the picks
    renderChips(); renderSchedule();
  }
});

let debounce;
$('searchInput').addEventListener('input', e => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); renderSchedule(); }, 120);
});

/* drawer open/close */
const openDrawer = () => { $('drawer').classList.add('open'); $('scrim').classList.add('show'); };
const closeDrawer = () => { $('drawer').classList.remove('open'); $('scrim').classList.remove('show'); };
$('openPlan').addEventListener('click', openDrawer);
$('closePlan').addEventListener('click', closeDrawer);
$('scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

/* copy plan */
$('copyPlan').addEventListener('click', async () => {
  const text = planText();
  try {
    await navigator.clipboard.writeText(text);
    toast('Plan copied to clipboard');
  } catch (err) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Plan copied to clipboard'); }
    catch (e2) { toast('Copy failed — select the text manually'); }
    ta.remove();
  }
});

/* clear plan */
$('clearPlan').addEventListener('click', () => {
  const n = selected.size;
  selected.clear();
  const ok = savePlan();
  updateSavedNote(ok);
  renderAll();
  toast(n ? `Cleared ${n} talk${n > 1 ? 's' : ''} from your plan` : 'Nothing to clear');
});

/* ---------------- boot ---------------- */

renderAll();
updateSavedNote();
if (selected.size) {
  toast(`Welcome back — restored your ${selected.size} saved talk${selected.size > 1 ? 's' : ''}`);
}
