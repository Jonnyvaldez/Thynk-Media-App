// warroom.js — War Room tab

async function renderWarRoom() {
  const content = document.getElementById('tab-content')

  const [clients, allTasks, pipeline] = await Promise.all([
    getClients(),
    getTasks(),
    getPipeline()
  ])

  const activeClients = clients.filter(c => c.status === 'active' || c.status === 'performance_phase')
  const mrr = activeClients.filter(c => c.status === 'active').reduce((s, c) => s + (c.monthly_value || 0), 0)
  const mrrGoal = 25000
  const goalGap = mrrGoal - mrr

  const urgentTasks = allTasks.filter(t => t.is_urgent && !t.is_done)
  const blockedClients = new Set(urgentTasks.map(t => t.client_id)).size
  const top3 = urgentTasks.slice(0, 3)

  const weekKey = 'warroom-week-' + getMondayDate()
  const weekData = JSON.parse(localStorage.getItem(weekKey) || '{}')

  const days = getWeekDays()

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
      ${days.map(d => `
        <div class="week-day">
          <div class="day-label ${d.isToday ? 'today' : ''}">${d.short}<br><span style="font-weight:400">${d.date}</span></div>
          <textarea class="day-input" data-day="${d.key}" rows="1"
            placeholder="${d.isToday ? 'Today...' : ''}"
            oninput="autoResize(this)">${weekData[d.key] || ''}</textarea>
        </div>
      `).join('')}
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

  // Week ahead save
  content.querySelectorAll('.day-input').forEach(input => {
    input.addEventListener('input', () => {
      weekData[input.dataset.day] = input.value
      localStorage.setItem(weekKey, JSON.stringify(weekData))
    })
    autoResize(input)
  })

  updateClearedPill(activeClients, allTasks)
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
