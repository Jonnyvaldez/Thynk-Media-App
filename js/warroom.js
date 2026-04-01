// warroom.js — War Room tab

async function renderWarRoom() {
  const content = document.getElementById('tab-content')

  const days = getWeekDays()

  const [clients, allTasks, pipeline, weekEvents] = await Promise.all([
    getClients(),
    getTasks(),
    getPipeline(),
    getWeekEvents(days[0].key, days[6].key)
  ])

  const activeClients = clients.filter(c => c.status === 'active' || c.status === 'performance_phase')
  const mrr = activeClients.filter(c => c.status === 'active').reduce((s, c) => s + (c.monthly_value || 0), 0)
  const mrrGoal = 25000
  const goalGap = mrrGoal - mrr

  const urgentTasks = allTasks.filter(t => t.is_urgent && !t.is_done)
  const blockedClients = new Set(urgentTasks.map(t => t.client_id)).size
  const top3 = urgentTasks.slice(0, 3)


  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:17px;font-weight:700">War Room</div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);margin-top:2px">Week of ${days[0].label} ${days[0].date}</div>
      </div>
      <div id="cleared-pill" style="font-family:var(--font-mono);font-size:10px;font-weight:700;background:var(--card-inner);border:1px solid var(--border);border-radius:6px;padding:4px 10px;color:var(--muted)">
        0/${activeClients.length} cleared
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">MRR</div>
        <div class="stat-value green">$${mrr.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active</div>
        <div class="stat-value">${activeClients.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Blocked</div>
        <div class="stat-value ${blockedClients > 0 ? 'red' : ''}">${blockedClients}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Goal gap</div>
        <div class="stat-value" style="font-size:14px">$${goalGap.toLocaleString()}</div>
      </div>
    </div>

    <!-- Top 3 -->
    ${top3.length > 0 ? `
    <div class="section-label">Top 3 This Week</div>
    ${top3.map((t, i) => `
      <div class="task-row urgent ${t.is_done ? 'done' : ''}" data-id="${t.id}" style="align-items:center">
        <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--red);width:20px;flex-shrink:0">0${i+1}</div>
        <div class="task-checkbox"></div>
        <div style="flex:1">
          <div class="task-text">${t.title}</div>
          <div class="task-meta">
            <span class="tag tag-${t.owner}">${t.owner.toUpperCase()}</span>
          </div>
        </div>
      </div>
    `).join('')}
    ` : ''}

    <!-- Client cards -->
    <div class="section-label">Clients</div>
    <div id="client-cards-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${activeClients.map(c => {
        const tasks = allTasks.filter(t => t.client_id === c.id && !t.is_done)
        const hasBlocker = tasks.some(t => t.is_urgent)
        return `
          <div class="card" style="padding:12px" data-client-id="${c.id}">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
              <span class="status-dot ${c.status === 'active' ? 'dot-active' : 'dot-perf'}"></span>
              <span style="font-size:12px;font-weight:600">${c.name}</span>
            </div>
            ${hasBlocker ? '<div class="tag tag-blocker" style="margin-bottom:8px;display:inline-block">BLOCKER</div>' : ''}
            ${tasks.length === 0
              ? '<div style="font-size:11px;color:var(--green)">✓ All clear</div>'
              : tasks.map(t => `
                <div class="task-row ${t.is_urgent ? 'urgent' : ''} ${t.is_done ? 'done' : ''}" data-id="${t.id}" style="padding:6px 8px;margin-bottom:4px">
                  <div class="task-checkbox" style="width:11px;height:11px"></div>
                  <div style="flex:1">
                    <div class="task-text" style="font-size:11px">${t.title}</div>
                    <span class="tag tag-${t.owner}" style="margin-top:3px;display:inline-block">${t.owner.toUpperCase()}</span>
                  </div>
                </div>
              `).join('')
            }
          </div>
        `
      }).join('')}
    </div>

    <!-- Week Ahead -->
    <div class="section-label">The Week Ahead</div>
    <div id="week-ahead">
      ${days.map(d => dayCardHTML(d, weekEvents.filter(e => e.date === d.key))).join('')}
    </div>

    <!-- Pipeline Pulse -->
    <div class="section-label">Pipeline Pulse</div>
    ${pipeline.map(p => `
      <div class="card-inner" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:500">${p.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${p.status || ''}</div>
          ${p.next_action ? `<div style="font-size:11px;color:var(--text);margin-top:3px">${p.next_action}</div>` : ''}
        </div>
        <div class="tag tag-${p.owner || 'jonny'}">${(p.owner || 'jonny').toUpperCase()}</div>
      </div>
    `).join('')}

    <!-- Rules -->
    <div class="rules-box">
      <div class="rules-title">NON-NEGOTIABLE RULES</div>
      <div class="rule-item"><span class="rule-num">01</span> Never quote below $1,100/mo for new clients</div>
      <div class="rule-item"><span class="rule-num">02</span> Setup fee always collected upfront regardless of deal model</div>
      <div class="rule-item"><span class="rule-num">03</span> Blaze Media clients stay separate from Thynk Media finances</div>
    </div>
  `

  // Task toggles
  content.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', async () => {
      const taskId = row.dataset.id
      const isDone = !row.classList.contains('done')
      row.classList.toggle('done', isDone)
      await toggleTask(taskId, isDone)
      updateClearedPill(activeClients, allTasks)
    })
  })

  updateClearedPill(activeClients, allTasks)
  wireWeekAheadEvents()
}

function updateClearedPill(activeClients, allTasks) {
  const clearedCount = activeClients.filter(c => {
    return allTasks.filter(t => t.client_id === c.id && !t.is_done).length === 0
  }).length
  const pill = document.getElementById('cleared-pill')
  if (pill) pill.textContent = `${clearedCount}/${activeClients.length} cleared`
}

function autoResize(el) {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function localDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function getMondayDate() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return localDateStr(monday)
}

function getWeekDays() {
  const monday = new Date(getMondayDate() + 'T00:00:00')
  const todayStr = localDateStr(new Date())
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = localDateStr(d)
    return {
      short: dayNames[i],
      label: dayLabels[i],
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      key: dateStr,
      isToday: dateStr === todayStr
    }
  })
}

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
