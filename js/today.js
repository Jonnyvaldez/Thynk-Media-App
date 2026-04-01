// today.js — Today tab render

async function renderToday() {
  const content = document.getElementById('tab-content')

  const todayStr = localDateStr(new Date())

  const [urgentTasks, weekTasks, payments, clients, todayEvents] = await Promise.all([
    getUrgentTasks(),
    getThisWeekTasks(),
    getPaymentsDue(),
    getClients(),
    getEvents(todayStr)
  ])

  const mrr = clients.filter(c => c.status === 'active').reduce((s, c) => s + (c.monthly_value || 0), 0)
  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--muted);letter-spacing:0.12em;text-transform:uppercase">${dayName}</div>
        <div style="font-size:18px;font-weight:700;margin-top:2px">${dateStr}</div>
      </div>
      <div style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--green);background:rgba(39,152,90,0.1);border:1px solid rgba(39,152,90,0.2);border-radius:6px;padding:5px 10px">$${mrr.toLocaleString()}/mo</div>
    </div>

    ${todayEvents.length > 0 ? `
    <div class="section-label">Today's Schedule</div>
    ${todayEvents.map(e => scheduleRowHTML(e)).join('')}
    ` : ''}

    ${urgentTasks.length > 0 ? `
    <div class="section-label">Urgent</div>
    ${urgentTasks.map(t => taskRowHTML(t, 'urgent')).join('')}
    ` : ''}

    ${weekTasks.length > 0 ? `
    <div class="section-label">This Week</div>
    ${weekTasks.map(t => taskRowHTML(t, 'thisweek')).join('')}
    ` : ''}

    ${urgentTasks.length === 0 && weekTasks.length === 0 ? `
    <div class="empty-state" style="margin-top:40px">
      <div style="font-size:13px;color:var(--green);font-weight:600;margin-bottom:4px">All clear</div>
      <div style="font-size:12px">No urgent or upcoming tasks</div>
    </div>
    ` : ''}

    ${payments.length > 0 ? `
    <div class="section-label">Payments Due</div>
    ${payments.map(p => `
      <div class="card-inner" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:500">${p.clients.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Due ${formatDate(p.due_date)}</div>
        </div>
        <div style="font-family:var(--font-mono);font-weight:700;color:var(--amber)">$${p.amount.toLocaleString()}</div>
      </div>
    `).join('')}
    ` : ''}

    <div class="section-label">Clients</div>
    ${clients.filter(c => c.status === 'active' || c.status === 'performance_phase').map(c => `
      <div class="card-inner" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;cursor:pointer"
           onclick="location.hash='#clients/${c.id}'">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="status-dot ${c.status === 'active' ? 'dot-active' : 'dot-perf'}"></span>
          <span style="font-size:13px;font-weight:500">${c.name}</span>
        </div>
        <span style="font-size:11px;color:var(--muted)">→</span>
      </div>
    `).join('')}
  `

  // Wire task checkboxes
  content.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', async () => {
      const taskId = row.dataset.id
      const isDone = !row.classList.contains('done')
      row.classList.toggle('done', isDone)
      await toggleTask(taskId, isDone)
    })
  })
}

function taskRowHTML(task, type = '') {
  const done = task.is_done
  return `
    <div class="task-row ${type} ${done ? 'done' : ''}" data-id="${task.id}">
      <div class="task-checkbox"></div>
      <div style="flex:1">
        <div class="task-text">${task.title}</div>
        <div class="task-meta">
          ${task.owner === 'jonny' ? '<span class="tag tag-jonny">JONNY</span>' : '<span class="tag tag-alex">ALEX</span>'}
          ${task.clients ? `<span class="tag tag-client">${task.clients.name}</span>` : ''}
          ${task.due_date ? `<span style="font-size:10px;color:var(--muted)">${formatDate(task.due_date)}</span>` : ''}
        </div>
      </div>
    </div>
  `
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scheduleRowHTML(event) {
  const color = { call:'#0176D3', meeting:'#8B5CF6', deadline:'#F59E0B', launch:'#EF4444', task:'#22C55E' }[event.type] || '#6B7280'
  return `
    <div class="schedule-row">
      <span class="event-type-badge" style="background:${color}">${event.type.toUpperCase()}</span>
      <span class="schedule-row-title">${escapeHtml(event.title)}</span>
      ${event.time ? `<span class="schedule-row-time">${escapeHtml(event.time)}</span>` : ''}
      ${event.owner ? `<span class="schedule-row-owner">${event.owner.toUpperCase()}</span>` : ''}
    </div>
  `
}
