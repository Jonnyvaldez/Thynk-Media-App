# Calendar Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the War Room's plain-textarea Week Ahead with structured, color-coded event cards synced via Supabase, and surface today's events on the Today tab.

**Architecture:** A new `events` table in Supabase stores structured events (title, type, time, owner, date). The War Room Week Ahead section is rebuilt as 7 day cards with event chips; a lightweight modal handles event creation. The Today tab gains a "Today's Schedule" section. No external libraries — vanilla JS/HTML/CSS consistent with the existing codebase.

**Tech Stack:** Vanilla JS, Supabase JS v2, existing CSS variables, no test runner (manual verification).

---

## Codebase context

This is a single-page app. All JS files are loaded via `<script>` tags in `index.html`. Global functions defined in one file are available to all others. Key patterns:
- `db` is the Supabase client (from `js/supabase.js`)
- All DB functions live in `js/db.js` and are globally available
- Rendering functions write to `document.getElementById('tab-content').innerHTML`
- CSS variables: `--primary: #0176D3`, `--border: #E5E7EB`, `--card: #FFFFFF`, `--card-inner: #F9FAFB`, `--muted: #6B7280`, `--text: #111827`, `--radius: 10px`, `--font-mono: 'IBM Plex Mono'`
- `formatDate(dateStr)` is defined in `js/today.js` and globally available — takes a `YYYY-MM-DD` string, returns "Apr 1"
- `getWeekDays()` is defined in `js/warroom.js` — returns array of `{short, label, date, key (YYYY-MM-DD), isToday}`
- `localDateStr(d)` is defined in `js/warroom.js` — takes a Date, returns `YYYY-MM-DD` in local time

---

## Task 1: Supabase SQL — Create `events` table

**Files:** None (run manually in Supabase dashboard)

- [ ] **Step 1: Run this SQL in Supabase → SQL Editor → New query**

```sql
create table events (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  title      text not null,
  type       text not null check (type in ('call','meeting','deadline','launch','task')),
  time       text,
  owner      text,
  created_at timestamptz default now()
);

alter table events enable row level security;

create policy "agency read"   on events for select using (auth.uid() is not null);
create policy "agency insert" on events for insert with check (auth.uid() is not null);
create policy "agency delete" on events for delete using (auth.uid() is not null);
```

- [ ] **Step 2: Verify**

In Supabase → Table Editor, confirm `events` table exists with columns: `id`, `date`, `title`, `type`, `time`, `owner`, `created_at`.

---

## Task 2: db.js — Add event query functions

**Files:**
- Modify: `js/db.js` (append after the `getMRR` block, before the `// CLIENT PORTAL` block)

- [ ] **Step 1: Append four functions to `js/db.js`**

Find this line in `js/db.js`:
```javascript
// MRR helpers
async function getMRR() {
```

Append the following block **after** the `getMRR` function (before `// CLIENT PORTAL`):

```javascript
// EVENTS
async function getEvents(dateStr) {
  const { data, error } = await db
    .from('events').select('*').eq('date', dateStr).order('created_at')
  if (error) throw error
  return data || []
}

async function getWeekEvents(mondayStr, sundayStr) {
  const { data, error } = await db
    .from('events').select('*')
    .gte('date', mondayStr)
    .lte('date', sundayStr)
    .order('date')
    .order('created_at')
  if (error) throw error
  return data || []
}

async function addEvent(payload) {
  const { error } = await db.from('events').insert(payload)
  if (error) throw error
}

async function deleteEvent(id) {
  const { error } = await db.from('events').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Verify**

Open the browser console on the live app (after login), run:
```javascript
getWeekEvents('2026-03-30', '2026-04-05').then(console.log)
```
Expected: empty array `[]` (no events yet, no error).

- [ ] **Step 3: Commit**

```bash
git add js/db.js
git commit -m "feat: add event db functions (getEvents, getWeekEvents, addEvent, deleteEvent)"
```

---

## Task 3: css/styles.css — Add event and modal styles

**Files:**
- Modify: `css/styles.css` (append at end of file)

- [ ] **Step 1: Append the following CSS to the end of `css/styles.css`**

```css
/* ─── DAY CARDS (Week Ahead) ─────────────────────── */
.day-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  margin-bottom: 8px;
}
.day-card-today {
  background: #EFF6FF;
  border: 2px solid var(--primary);
}
.day-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.day-card-name {
  font-size: 10px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.05em;
  font-family: var(--font-mono);
}
.day-card-today .day-card-name { color: #1D4ED8; }
.day-card-date {
  font-size: 10px;
  color: var(--muted);
  margin-left: 5px;
}
.day-card-today-pill {
  font-size: 9px;
  background: var(--primary);
  color: #fff;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 7px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.day-card-add {
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 0 2px;
  font-weight: 300;
  transition: color 0.15s;
}
.day-card-add:hover { color: var(--primary); }
.day-card-today .day-card-add { color: var(--primary); }

/* ─── EVENT CHIPS ────────────────────────────────── */
.event-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  position: relative;
}
.event-chip:last-child { margin-bottom: 0; }
.event-type-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.event-chip-title {
  font-size: 11px;
  color: #111827;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-chip-time {
  font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}
.event-chip-owner {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--muted);
  flex-shrink: 0;
}
.event-chip-delete {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.event-chip:hover .event-chip-delete { opacity: 1; }
.event-chip-delete:hover { color: var(--red); }

/* ─── EVENT MODAL ────────────────────────────────── */
.event-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.event-modal-overlay.hidden { display: none; }
.event-modal {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.event-modal-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 16px;
}
.event-modal-field {
  margin-bottom: 14px;
}
.event-modal-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.event-modal-optional {
  font-weight: 400;
  text-transform: none;
  font-size: 9px;
  letter-spacing: 0;
}
.event-modal-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  box-sizing: border-box;
}
.event-modal-input:focus { border-color: var(--primary); }
.event-modal-row {
  display: flex;
  gap: 12px;
}
.event-modal-row .event-modal-field { flex: 1; }
.event-type-picker,
.event-owner-picker {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.event-type-btn,
.event-owner-btn {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--card-inner);
  color: var(--muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.event-type-btn.active {
  background: var(--type-color, var(--primary));
  color: #fff;
  border-color: transparent;
}
.event-owner-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: transparent;
}
.event-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
.btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.btn-primary:hover { background: #015bb0; border-color: #015bb0; color: #fff; }

/* ─── TODAY SCHEDULE ─────────────────────────────── */
.schedule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 6px;
}
.schedule-row-title {
  font-size: 13px;
  color: #111827;
  font-weight: 500;
  flex: 1;
}
.schedule-row-time {
  font-size: 11px;
  color: var(--muted);
}
.schedule-row-owner {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--muted);
}
```

- [ ] **Step 2: Verify**

Open the app in a browser and confirm no CSS errors in the console.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add day card, event chip, event modal, and schedule row CSS"
```

---

## Task 4: warroom.js — Replace Week Ahead with day cards

**Files:**
- Modify: `js/warroom.js`

The current Week Ahead in `renderWarRoom()` uses plain textareas saved to localStorage. This task replaces that section with day cards backed by Supabase events.

**Key facts about the existing file:**
- `getWeekDays()` returns array of 7 objects: `{short, label, date, key, isToday}` where `key` is `YYYY-MM-DD`
- `localDateStr(d)` converts a Date to `YYYY-MM-DD` in local time (already defined in the file)
- `getMondayDate()` returns `YYYY-MM-DD` string of the current week's Monday

- [ ] **Step 1: Add the event color map and helper functions at the bottom of `js/warroom.js`**

Append after the closing brace of `getWeekDays()`:

```javascript
// ─── CALENDAR EVENTS ─────────────────────────────

const EVENT_COLORS = {
  call: '#0176D3',
  meeting: '#8B5CF6',
  deadline: '#F59E0B',
  launch: '#EF4444',
  task: '#22C55E'
}

function dayCardHTML(day, events) {
  return `
    <div class="day-card ${day.isToday ? 'day-card-today' : ''}">
      <div class="day-card-header">
        <div>
          <span class="day-card-name">${day.short}</span>
          <span class="day-card-date">${day.date}</span>
          ${day.isToday ? '<span class="day-card-today-pill">TODAY</span>' : ''}
        </div>
        <button class="day-card-add" data-day="${day.key}" data-label="${day.label}, ${day.date}">+</button>
      </div>
      ${events.map(e => eventChipHTML(e)).join('')}
    </div>
  `
}

function eventChipHTML(event) {
  const color = EVENT_COLORS[event.type] || '#6B7280'
  return `
    <div class="event-chip">
      <span class="event-type-badge" style="background:${color}">${event.type.toUpperCase()}</span>
      <span class="event-chip-title">${event.title}</span>
      ${event.time ? `<span class="event-chip-time">${event.time}</span>` : ''}
      ${event.owner ? `<span class="event-chip-owner">${event.owner.toUpperCase()}</span>` : ''}
      <button class="event-chip-delete" data-id="${event.id}" title="Remove">×</button>
    </div>
  `
}

let _modalDayKey = null

function ensureEventModal() {
  if (document.getElementById('event-modal-overlay')) return
  const overlay = document.createElement('div')
  overlay.id = 'event-modal-overlay'
  overlay.className = 'event-modal-overlay hidden'
  overlay.innerHTML = `
    <div class="event-modal">
      <div class="event-modal-title" id="event-modal-day-label"></div>
      <div class="event-modal-field">
        <label class="event-modal-label">Title</label>
        <input id="event-modal-title-input" class="event-modal-input" type="text" placeholder="e.g. Aisha strategy call">
      </div>
      <div class="event-modal-field">
        <label class="event-modal-label">Type</label>
        <div class="event-type-picker">
          <button class="event-type-btn" data-type="call" style="--type-color:#0176D3">CALL</button>
          <button class="event-type-btn" data-type="meeting" style="--type-color:#8B5CF6">MEETING</button>
          <button class="event-type-btn" data-type="deadline" style="--type-color:#F59E0B">DEADLINE</button>
          <button class="event-type-btn" data-type="launch" style="--type-color:#EF4444">LAUNCH</button>
          <button class="event-type-btn" data-type="task" style="--type-color:#22C55E">TASK</button>
        </div>
      </div>
      <div class="event-modal-row">
        <div class="event-modal-field">
          <label class="event-modal-label">Time <span class="event-modal-optional">(optional)</span></label>
          <input id="event-modal-time-input" class="event-modal-input" type="text" placeholder="e.g. 10am">
        </div>
        <div class="event-modal-field">
          <label class="event-modal-label">Owner <span class="event-modal-optional">(optional)</span></label>
          <div class="event-owner-picker">
            <button class="event-owner-btn" data-owner="jonny">JONNY</button>
            <button class="event-owner-btn" data-owner="alex">ALEX</button>
            <button class="event-owner-btn" data-owner="both">BOTH</button>
          </div>
        </div>
      </div>
      <div class="event-modal-actions">
        <button id="event-modal-cancel" class="btn">Cancel</button>
        <button id="event-modal-save" class="btn btn-primary">Add Event</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelectorAll('.event-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.event-type-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  overlay.querySelectorAll('.event-owner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active')
      overlay.querySelectorAll('.event-owner-btn').forEach(b => b.classList.remove('active'))
      if (!wasActive) btn.classList.add('active')
    })
  })

  overlay.querySelector('#event-modal-cancel').addEventListener('click', closeEventModal)
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEventModal() })

  overlay.querySelector('#event-modal-save').addEventListener('click', saveEventFromModal)

  overlay.querySelector('#event-modal-title-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') overlay.querySelector('#event-modal-save').click()
  })
}

function openEventModal(dayKey, dayLabel) {
  ensureEventModal()
  _modalDayKey = dayKey
  document.getElementById('event-modal-day-label').textContent = 'Add event — ' + dayLabel
  document.getElementById('event-modal-title-input').value = ''
  document.getElementById('event-modal-time-input').value = ''
  document.querySelectorAll('.event-type-btn').forEach(b => b.classList.remove('active'))
  document.querySelectorAll('.event-owner-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('event-modal-overlay').classList.remove('hidden')
  document.getElementById('event-modal-title-input').focus()
}

function closeEventModal() {
  const overlay = document.getElementById('event-modal-overlay')
  if (overlay) overlay.classList.add('hidden')
  _modalDayKey = null
}

async function saveEventFromModal() {
  const title = document.getElementById('event-modal-title-input').value.trim()
  if (!title) { document.getElementById('event-modal-title-input').focus(); return }

  const activeType = document.querySelector('.event-type-btn.active')
  if (!activeType) {
    document.querySelector('.event-type-picker').style.outline = '1px solid var(--red)'
    setTimeout(() => document.querySelector('.event-type-picker').style.outline = '', 1200)
    return
  }

  const time  = document.getElementById('event-modal-time-input').value.trim() || null
  const activeOwner = document.querySelector('.event-owner-btn.active')
  const owner = activeOwner ? activeOwner.dataset.owner : null

  const btn = document.getElementById('event-modal-save')
  btn.disabled = true
  btn.textContent = 'Saving...'

  try {
    await addEvent({ date: _modalDayKey, title, type: activeType.dataset.type, time, owner })
    closeEventModal()
    await refreshWeekAhead()
  } catch (err) {
    console.error('Failed to save event:', err)
  } finally {
    btn.disabled = false
    btn.textContent = 'Add Event'
  }
}

async function refreshWeekAhead() {
  const days = getWeekDays()
  const weekEvents = await getWeekEvents(days[0].key, days[6].key)
  const container = document.getElementById('week-ahead')
  if (!container) return
  container.innerHTML = days.map(d => dayCardHTML(d, weekEvents.filter(e => e.date === d.key))).join('')
  wireWeekAheadEvents()
}

function wireWeekAheadEvents() {
  document.querySelectorAll('.day-card-add').forEach(btn => {
    btn.addEventListener('click', () => openEventModal(btn.dataset.day, btn.dataset.label))
  })
  document.querySelectorAll('.event-chip-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      await deleteEvent(btn.dataset.id)
      await refreshWeekAhead()
    })
  })
}
```

- [ ] **Step 2: Update `renderWarRoom()` — move `days` before the Promise.all and add `weekEvents`**

In `renderWarRoom()`, find:
```javascript
  const [clients, allTasks, pipeline] = await Promise.all([
    getClients(),
    getTasks(),
    getPipeline()
  ])
```

Replace with:
```javascript
  const days = getWeekDays()

  const [clients, allTasks, pipeline, weekEvents] = await Promise.all([
    getClients(),
    getTasks(),
    getPipeline(),
    getWeekEvents(days[0].key, days[6].key)
  ])
```

- [ ] **Step 3: Remove the old `weekKey`/`weekData`/`days` declarations**

Find and delete these three lines (they appear after the `const mrrGoal` block):
```javascript
  const weekKey = 'warroom-week-' + getMondayDate()
  const weekData = JSON.parse(localStorage.getItem(weekKey) || '{}')

  const days = getWeekDays()
```

(The `days` declaration is now at the top — this is the duplicate to remove.)

- [ ] **Step 4: Replace the Week Ahead HTML section**

Find this block inside `content.innerHTML`:
```javascript
    <!-- Week Ahead -->
    <div class="section-label">The Week Ahead</div>
    <div id="week-ahead">
      ${days.map(d => `
        <div class="week-day">
          <div class="day-label ${d.isToday ? 'today' : ''}">${d.short}<br><span style="font-weight:400">${d.date}</span></div>
          <textarea class="day-input" data-day="${d.key}" rows="1"
            placeholder="${d.isToday ? 'Today...' : ''}"
            oninput="autoResize(this)">${weekData[d.key] || ''}</textarea>
        </div>
      `).join('')}
    </div>
```

Replace with:
```javascript
    <!-- Week Ahead -->
    <div class="section-label">The Week Ahead</div>
    <div id="week-ahead">
      ${days.map(d => dayCardHTML(d, weekEvents.filter(e => e.date === d.key))).join('')}
    </div>
```

- [ ] **Step 5: Remove the localStorage event listeners and add `wireWeekAheadEvents()`**

Find and delete this entire block (after `updateClearedPill`):
```javascript
  // Week ahead save
  content.querySelectorAll('.day-input').forEach(input => {
    input.addEventListener('input', () => {
      weekData[input.dataset.day] = input.value
      localStorage.setItem(weekKey, JSON.stringify(weekData))
    })
    autoResize(input)
  })
```

Then, after the `updateClearedPill(activeClients, allTasks)` call at the bottom of `renderWarRoom`, add:
```javascript
  wireWeekAheadEvents()
```

- [ ] **Step 6: Verify**

1. Open War Room tab — Week Ahead shows 7 day cards, today's card has blue border
2. Click `+` on any day — modal opens with correct title, type buttons, time/owner inputs
3. Enter a title, pick a type, click "Add Event" — chip appears in the day card
4. Hover over the chip — `×` button appears
5. Click `×` — chip disappears
6. Reload the page — events persist (Supabase, not localStorage)

- [ ] **Step 7: Commit**

```bash
git add js/warroom.js
git commit -m "feat: replace War Room Week Ahead textareas with synced event day cards"
```

---

## Task 5: today.js — Add Today's Schedule section

**Files:**
- Modify: `js/today.js`

The Today tab currently shows: header → Urgent tasks → This Week tasks → Payments Due → Clients. We add "Today's Schedule" between the header and Urgent.

- [ ] **Step 1: Add `getEvents` to the `Promise.all` in `renderToday()`**

Find:
```javascript
  const [urgentTasks, weekTasks, payments, clients] = await Promise.all([
    getUrgentTasks(),
    getThisWeekTasks(),
    getPaymentsDue(),
    getClients()
  ])
```

Replace with:
```javascript
  const todayStr = localDateStr(new Date())

  const [urgentTasks, weekTasks, payments, clients, todayEvents] = await Promise.all([
    getUrgentTasks(),
    getThisWeekTasks(),
    getPaymentsDue(),
    getClients(),
    getEvents(todayStr)
  ])
```

Note: `localDateStr` is defined in `js/warroom.js` and globally available.

- [ ] **Step 2: Insert the Today's Schedule section into `content.innerHTML`**

In `content.innerHTML`, find the line:
```javascript
    ${urgentTasks.length > 0 ? `
    <div class="section-label">Urgent</div>
```

Insert the following **immediately before** that line:
```javascript
    ${todayEvents.length > 0 ? `
    <div class="section-label">Today's Schedule</div>
    ${todayEvents.map(e => scheduleRowHTML(e)).join('')}
    ` : ''}

```

- [ ] **Step 3: Add the `scheduleRowHTML` helper function at the bottom of `js/today.js`**

Append after `formatDate`:
```javascript
function scheduleRowHTML(event) {
  const color = { call:'#0176D3', meeting:'#8B5CF6', deadline:'#F59E0B', launch:'#EF4444', task:'#22C55E' }[event.type] || '#6B7280'
  return `
    <div class="schedule-row">
      <span class="event-type-badge" style="background:${color}">${event.type.toUpperCase()}</span>
      <span class="schedule-row-title">${event.title}</span>
      ${event.time ? `<span class="schedule-row-time">${event.time}</span>` : ''}
      ${event.owner ? `<span class="schedule-row-owner">${event.owner.toUpperCase()}</span>` : ''}
    </div>
  `
}
```

- [ ] **Step 4: Verify**

1. Go to War Room → add an event on today's date
2. Switch to Today tab — "Today's Schedule" section appears with the event
3. If no events today, the section is hidden entirely (not shown)
4. Add a second event in War Room — both appear on Today tab

- [ ] **Step 5: Commit**

```bash
git add js/today.js
git commit -m "feat: add Today's Schedule section to Today tab"
```

---

## Task 6: Push and deploy

- [ ] **Step 1: Push to GitHub (triggers Netlify auto-deploy)**

```bash
git push
```

- [ ] **Step 2: Verify on live site**

1. Open the live Netlify URL
2. Log in as Jonny
3. Go to War Room → add a "Call" event for today — blue chip appears
4. Go to Today tab — event shows in Today's Schedule
5. Open hub in a second browser as Alex — event is visible (Supabase sync confirmed)
