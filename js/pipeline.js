// pipeline.js — pipeline list + inline edit

async function renderPipeline() {
  const content = document.getElementById('tab-content')
  const prospects = await getPipeline()

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:17px;font-weight:700">Pipeline</div>
      <button class="btn btn-sm" id="add-prospect-btn">+ Add</button>
    </div>

    <div id="add-prospect-form" class="inline-form" style="margin-bottom:12px">
      <div class="form-group">
        <label class="form-label">Business name</label>
        <input class="form-input" id="p-name" placeholder="e.g. Coffee Republic">
      </div>
      <div class="form-row">
        <div style="flex:1">
          <label class="form-label">Status</label>
          <input class="form-input" id="p-status" placeholder="e.g. Audit sent">
        </div>
        <div style="flex:1">
          <label class="form-label">Owner</label>
          <select class="form-input" id="p-owner">
            <option value="jonny">Jonny</option>
            <option value="alex">Alex</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div style="flex:1">
          <label class="form-label">Recommended tier</label>
          <input class="form-input" id="p-tier" placeholder="e.g. Tier 1 + Google Ads">
        </div>
        <div style="flex:1">
          <label class="form-label">Monthly value ($)</label>
          <input class="form-input" id="p-value" type="number" placeholder="1100">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Next action</label>
        <input class="form-input" id="p-action" placeholder="e.g. Follow up Monday">
      </div>
      <div class="form-group">
        <label class="form-label">Last contact</label>
        <input class="form-input" id="p-contact" type="date">
      </div>
      <div class="form-actions">
        <button class="btn btn-sm" onclick="document.getElementById('add-prospect-form').classList.remove('open')">Cancel</button>
        <button class="btn btn-primary btn-sm" id="save-prospect-btn">Add Prospect</button>
      </div>
    </div>

    <div id="prospects-list">
      ${prospects.length === 0
        ? '<div class="empty-state">No prospects yet</div>'
        : prospects.map(p => prospectRowHTML(p)).join('')}
    </div>
  `

  document.getElementById('add-prospect-btn').addEventListener('click', () => {
    document.getElementById('add-prospect-form').classList.toggle('open')
  })

  document.getElementById('save-prospect-btn').addEventListener('click', async () => {
    const name = document.getElementById('p-name').value.trim()
    if (!name) return
    await addProspect({
      name,
      status: document.getElementById('p-status').value.trim(),
      owner: document.getElementById('p-owner').value,
      recommended_tier: document.getElementById('p-tier').value.trim(),
      monthly_value: parseInt(document.getElementById('p-value').value) || 0,
      next_action: document.getElementById('p-action').value.trim(),
      last_contact_date: document.getElementById('p-contact').value || null
    })
    await renderPipeline()
  })

  // Expand/collapse inline edit
  content.querySelectorAll('#prospects-list .card').forEach(row => {
    row.querySelector('.prospect-header').addEventListener('click', () => {
      const editForm = row.querySelector('.prospect-edit')
      const isOpen = editForm.style.display !== 'none'
      content.querySelectorAll('.prospect-edit').forEach(f => { f.style.display = 'none' })
      if (!isOpen) editForm.style.display = 'block'
    })

    row.querySelector('.save-prospect-edit').addEventListener('click', async () => {
      const id = row.dataset.id
      await updateProspect(id, {
        status: row.querySelector('.edit-status').value.trim(),
        next_action: row.querySelector('.edit-action').value.trim(),
        owner: row.querySelector('.edit-owner').value,
        last_contact_date: row.querySelector('.edit-contact').value || null,
        monthly_value: parseInt(row.querySelector('.edit-value').value) || 0,
        recommended_tier: row.querySelector('.edit-tier').value.trim()
      })
      await renderPipeline()
    })
  })
}

function prospectRowHTML(p) {
  return `
    <div class="card" style="margin-bottom:8px;padding:0;overflow:hidden" data-id="${p.id}">
      <div class="prospect-header" style="padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${p.name}</div>
          <div style="font-size:11px;color:var(--muted)">${p.status || 'No status'}</div>
          ${p.next_action ? `<div style="font-size:12px;color:var(--text);margin-top:4px">${p.next_action}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px">
          ${p.monthly_value ? `<div style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--green)">$${p.monthly_value.toLocaleString()}</div>` : ''}
          ${p.owner ? `<div class="tag tag-${p.owner}" style="margin-top:4px">${p.owner.toUpperCase()}</div>` : ''}
          ${p.last_contact_date ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">${formatDate(p.last_contact_date)}</div>` : ''}
        </div>
      </div>
      <div class="prospect-edit" style="display:none;padding:12px 14px;border-top:1px solid var(--border);background:var(--card-inner)">
        <div class="form-row">
          <div style="flex:2">
            <label class="form-label">Status</label>
            <input class="form-input edit-status" value="${p.status || ''}">
          </div>
          <div style="flex:1">
            <label class="form-label">Owner</label>
            <select class="form-input edit-owner">
              <option value="jonny" ${p.owner === 'jonny' ? 'selected' : ''}>Jonny</option>
              <option value="alex" ${p.owner === 'alex' ? 'selected' : ''}>Alex</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Next action</label>
          <input class="form-input edit-action" value="${p.next_action || ''}">
        </div>
        <div class="form-row">
          <div style="flex:1">
            <label class="form-label">Tier</label>
            <input class="form-input edit-tier" value="${p.recommended_tier || ''}">
          </div>
          <div style="flex:1">
            <label class="form-label">Value ($)</label>
            <input class="form-input edit-value" type="number" value="${p.monthly_value || ''}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Last contact</label>
          <input class="form-input edit-contact" type="date" value="${p.last_contact_date || ''}">
        </div>
        <div class="form-actions">
          <button class="btn btn-primary btn-sm save-prospect-edit">Save</button>
        </div>
      </div>
    </div>
  `
}
