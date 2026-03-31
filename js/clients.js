// clients.js — client list + detail with sub-tabs

async function renderClients() {
  const content = document.getElementById('tab-content')
  const clients = await getClients()
  const active = clients.filter(c => c.status === 'active' || c.status === 'performance_phase')

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:17px;font-weight:700">Clients</div>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">${active.length} active</div>
    </div>
    <div class="client-grid">
      ${active.map(c => `
        <div class="client-card" onclick="location.hash='#clients/${c.id}'">
          <div style="margin-bottom:6px">
            <span class="status-dot ${c.status === 'active' ? 'dot-active' : 'dot-perf'}"></span>
            <span style="font-family:var(--font-mono);font-size:8px;color:${c.status === 'active' ? 'var(--green)' : 'var(--amber)'}">${c.status === 'active' ? 'ACTIVE' : 'PERF PHASE'}</span>
          </div>
          <div class="client-name">${c.name}</div>
          <div class="client-biz">${c.business_type || ''}</div>
          ${c.monthly_value ? `<div class="client-mrr">$${c.monthly_value.toLocaleString()}/mo</div>` : '<div style="font-size:11px;color:var(--muted)">Pending</div>'}
        </div>
      `).join('')}
    </div>
  `
}

async function renderClientDetail(clientId, subtab) {
  const content = document.getElementById('tab-content')
  const client = await getClient(clientId)

  content.innerHTML = `
    <button class="back-btn" onclick="location.hash='#clients'">← Clients</button>
    <div style="margin-bottom:14px">
      <div style="font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:0.1em;color:${client.status === 'active' ? 'var(--green)' : 'var(--amber)'}">
        ● ${client.status === 'active' ? 'ACTIVE' : 'PERFORMANCE PHASE'}
      </div>
      <div style="font-size:20px;font-weight:700;margin-top:3px">${client.name}</div>
      ${client.business_type ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${client.business_type}</div>` : ''}
    </div>
    <div class="subtabs">
      <button class="subtab ${subtab === 'overview' ? 'active' : ''}" onclick="location.hash='#clients/${clientId}/overview'">OVERVIEW</button>
      <button class="subtab ${subtab === 'tasks' ? 'active' : ''}" onclick="location.hash='#clients/${clientId}/tasks'">TASKS</button>
      <button class="subtab ${subtab === 'files' ? 'active' : ''}" onclick="location.hash='#clients/${clientId}/files'">FILES</button>
      <button class="subtab ${subtab === 'notes' ? 'active' : ''}" onclick="location.hash='#clients/${clientId}/notes'">NOTES</button>
    </div>
    <div id="subtab-content"></div>
  `

  const subtabContent = document.getElementById('subtab-content')

  if (subtab === 'overview') await renderOverview(client, subtabContent)
  else if (subtab === 'tasks') await renderTasks(clientId, subtabContent)
  else if (subtab === 'files') await renderFiles(clientId, subtabContent)
  else if (subtab === 'notes') await renderNotes(clientId, subtabContent)
}

async function renderOverview(client, container) {
  const payments = await getPaymentsDue()
  const clientPayment = payments.find(p => p.client_id === client.id)

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div class="stat-card">
        <div class="stat-label">Monthly</div>
        <div class="stat-value ${client.monthly_value ? 'green' : ''}" style="font-size:16px">
          ${client.monthly_value ? '$' + client.monthly_value.toLocaleString() : '—'}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Channel</div>
        <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;margin-top:4px">${client.channel || '—'}</div>
      </div>
    </div>
    ${clientPayment ? `
    <div class="card-inner" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:12px;color:var(--muted)">Next payment</div>
      <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--red)">$${clientPayment.amount.toLocaleString()} · ${formatDate(clientPayment.due_date)}</div>
    </div>
    ` : ''}
    <div style="margin-top:16px">
      <div class="section-label">Deal</div>
      <div class="card-inner">
        <div style="font-size:13px">${client.deal_type || 'Not set'}</div>
        ${client.start_date ? `<div style="font-size:11px;color:var(--muted);margin-top:4px">Started ${formatDate(client.start_date)}</div>` : ''}
      </div>
    </div>
  `
}

async function renderTasks(clientId, container) {
  const tasks = await getTasks(clientId)
  const jonnyTasks = tasks.filter(t => t.owner === 'jonny')
  const alexTasks = tasks.filter(t => t.owner === 'alex')

  container.innerHTML = `
    <div id="add-task-form" class="inline-form">
      <div class="form-group">
        <label class="form-label">Task</label>
        <input class="form-input" id="new-task-title" placeholder="What needs to happen?">
      </div>
      <div class="form-row">
        <div style="flex:1">
          <label class="form-label">Owner</label>
          <select class="form-input" id="new-task-owner">
            <option value="jonny">Jonny</option>
            <option value="alex">Alex</option>
          </select>
        </div>
        <div style="flex:1">
          <label class="form-label">Due date</label>
          <input class="form-input" id="new-task-due" type="date">
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <input type="checkbox" id="new-task-urgent">
        <label for="new-task-urgent" style="font-size:13px;cursor:pointer">Mark as urgent</label>
      </div>
      <div class="form-actions">
        <button class="btn btn-sm" onclick="document.getElementById('add-task-form').classList.remove('open')">Cancel</button>
        <button class="btn btn-primary btn-sm" id="save-task-btn">Add Task</button>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-sm" onclick="document.getElementById('add-task-form').classList.toggle('open')">+ Add task</button>
    </div>

    ${jonnyTasks.length > 0 ? `
    <div class="section-label">Jonny</div>
    ${jonnyTasks.map(t => taskRowHTML(t, t.is_urgent ? 'urgent' : '')).join('')}
    ` : ''}

    ${alexTasks.length > 0 ? `
    <div class="section-label">Alex</div>
    ${alexTasks.map(t => taskRowHTML(t, t.is_urgent ? 'urgent' : '')).join('')}
    ` : ''}

    ${tasks.length === 0 ? '<div class="empty-state">No tasks yet</div>' : ''}
  `

  // Task toggles
  container.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', async () => {
      const taskId = row.dataset.id
      const isDone = !row.classList.contains('done')
      row.classList.toggle('done', isDone)
      await toggleTask(taskId, isDone)
    })
  })

  // Save new task
  document.getElementById('save-task-btn').addEventListener('click', async () => {
    const title = document.getElementById('new-task-title').value.trim()
    if (!title) return
    const owner = document.getElementById('new-task-owner').value
    const dueDate = document.getElementById('new-task-due').value
    const isUrgent = document.getElementById('new-task-urgent').checked
    await addTask(clientId, title, owner, dueDate, isUrgent)
    await renderTasks(clientId, container)
  })
}

async function renderFiles(clientId, container) {
  const files = await getFiles(clientId)

  container.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn-sm" id="upload-btn">⬆ Upload file</button>
      <button class="btn btn-sm" id="link-btn">🔗 Paste link</button>
      <input type="file" id="file-input" style="display:none" accept=".pdf,.png,.jpg,.jpeg,.mp4,.docx,.doc">
    </div>

    <div id="link-form" class="inline-form" style="margin-bottom:10px">
      <div class="form-group">
        <label class="form-label">Label</label>
        <input class="form-input" id="link-label" placeholder="e.g. Signed Agreement, Google Drive Folder">
      </div>
      <div class="form-group">
        <label class="form-label">URL</label>
        <input class="form-input" id="link-url" placeholder="https://...">
      </div>
      <div class="form-actions">
        <button class="btn btn-sm" onclick="document.getElementById('link-form').classList.remove('open')">Cancel</button>
        <button class="btn btn-primary btn-sm" id="save-link-btn">Save Link</button>
      </div>
    </div>

    <div id="files-list">
      ${files.length === 0 ? '<div class="empty-state">No files yet</div>' : files.map(f => fileRowHTML(f)).join('')}
    </div>
  `

  // Upload file
  document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('file-input').click()
  })
  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    document.getElementById('upload-btn').textContent = 'Uploading...'
    try {
      await uploadFile(clientId, file)
      await renderFiles(clientId, container)
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
    document.getElementById('upload-btn').textContent = '⬆ Upload file'
  })

  // Add link
  document.getElementById('link-btn').addEventListener('click', () => {
    document.getElementById('link-form').classList.toggle('open')
  })
  document.getElementById('save-link-btn').addEventListener('click', async () => {
    const label = document.getElementById('link-label').value.trim()
    const url = document.getElementById('link-url').value.trim()
    if (!label || !url) return
    await addLink(clientId, label, url)
    await renderFiles(clientId, container)
  })

  // Delete
  container.querySelectorAll('.file-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fileId = btn.dataset.id
      const storagePath = btn.dataset.path || null
      if (!confirm('Delete this file?')) return
      await deleteFile(fileId, storagePath)
      await renderFiles(clientId, container)
    })
  })
}

function fileRowHTML(f) {
  const icon = f.type === 'upload' ? (f.label.endsWith('.pdf') ? '📋' : f.label.match(/\.(mp4|mov)$/i) ? '🎥' : '📎') : '🔗'
  const sizeStr = f.size_bytes ? ` · ${Math.round(f.size_bytes / 1024)} KB` : ''
  return `
    <div class="file-row">
      <div class="file-icon">${icon}</div>
      <div class="file-info">
        <a href="${f.url}" target="_blank" class="file-label file-link">${f.label}</a>
        <div class="file-meta">${f.type === 'upload' ? 'Uploaded' : 'Link'} · ${formatDate(f.created_at.split('T')[0])}${sizeStr}</div>
      </div>
      <button class="file-delete" data-id="${f.id}" data-path="${f.storage_path || ''}" title="Delete">✕</button>
    </div>
  `
}

async function renderNotes(clientId, container) {
  const note = await getNote(clientId)
  container.innerHTML = `
    <div class="section-label">Notes</div>
    <textarea class="form-input" id="notes-area" style="min-height:200px;margin-bottom:8px">${note ? note.content : ''}</textarea>
    <div style="font-size:11px;color:var(--muted)" id="notes-status">Auto-saves on blur</div>
  `
  const area = document.getElementById('notes-area')
  const status = document.getElementById('notes-status')
  area.addEventListener('blur', async () => {
    status.textContent = 'Saving...'
    await saveNote(clientId, area.value)
    status.textContent = 'Saved ✓'
    setTimeout(() => { status.textContent = 'Auto-saves on blur' }, 2000)
  })
}
