// client-portal.js — read-only client-facing portal

async function renderClientPortal(clientId) {
  const container = document.getElementById('portal-content')
  container.innerHTML = '<div class="loading">LOADING...</div>'
  try {
    const { client, tasks, files, note, payment } = await getClientPortalData(clientId)
    const statusColor = client.status === 'active' ? 'var(--green)' : 'var(--amber)'
    const statusLabel = client.status === 'active' ? 'ACTIVE' : 'PERFORMANCE PHASE'
    const statusDot   = client.status === 'active' ? 'dot-active' : 'dot-perf'

    container.innerHTML = `
      <div class="portal-header">
        <div style="font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:0.1em;color:${statusColor}">
          <span class="status-dot ${statusDot}"></span>${statusLabel}
        </div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${client.name}</div>
        ${client.business_type ? `<div style="font-size:12px;color:var(--muted);margin-top:2px">${client.business_type}</div>` : ''}
      </div>

      ${payment ? `
      <div class="section-label">Next Payment</div>
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:var(--text-secondary)">Due ${formatDate(payment.due_date)}</div>
        <div style="font-family:var(--font-mono);font-size:16px;font-weight:700;color:var(--amber)">$${payment.amount.toLocaleString()}</div>
      </div>
      ` : ''}

      <div class="section-label">Open Tasks</div>
      ${tasks.length === 0 ? '<div class="empty-state">No open tasks right now</div>' : tasks.map(t => portalTaskRowHTML(t)).join('')}

      <div class="section-label">Files & Links</div>
      ${files.length === 0 ? '<div class="empty-state">No files yet</div>' : files.map(f => portalFileRowHTML(f)).join('')}

      ${note && note.content ? `
      <div class="section-label">Campaign Updates</div>
      <div class="card">
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.65;white-space:pre-wrap">${escapeHtml(note.content)}</div>
      </div>
      ` : ''}
    `
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:var(--red)">Something went wrong. Please sign out and try again.</div>`
    console.error('Portal load error:', err)
  }
}

function portalTaskRowHTML(t) {
  return `
    <div class="task-row ${t.is_urgent ? 'urgent' : ''}" style="cursor:default">
      <div class="task-checkbox"></div>
      <div style="flex:1">
        <div class="task-text">${t.title}</div>
        ${t.due_date ? `<div class="task-meta"><span style="font-size:10px;color:var(--muted)">${formatDate(t.due_date)}</span></div>` : ''}
      </div>
      ${t.is_urgent ? '<span class="tag tag-urgent">URGENT</span>' : ''}
    </div>
  `
}

function portalFileRowHTML(f) {
  const isPdf = f.label.toLowerCase().endsWith('.pdf')
  const isVideo = /\.(mp4|mov)$/i.test(f.label)
  const icon = f.type === 'upload' ? (isPdf ? '📋' : isVideo ? '🎥' : '📎') : '🔗'
  const sizeStr = f.size_bytes ? ` · ${Math.round(f.size_bytes / 1024)} KB` : ''
  return `
    <div class="file-row">
      <div class="file-icon">${icon}</div>
      <div class="file-info">
        <a href="${f.url}" target="_blank" class="file-label file-link">${f.label}</a>
        <div class="file-meta">${f.type === 'upload' ? 'Uploaded' : 'Link'} · ${formatDate(f.created_at.split('T')[0])}${sizeStr}</div>
      </div>
    </div>
  `
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
