// db.js — all Supabase query functions

// CLIENTS
async function getClients(statusFilter = null) {
  let query = db.from('clients').select('*').order('created_at')
  if (statusFilter) query = query.eq('status', statusFilter)
  const { data, error } = await query
  if (error) throw error
  return data
}

async function getClient(id) {
  const { data, error } = await db.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

async function updateClient(id, updates) {
  const { error } = await db.from('clients').update(updates).eq('id', id)
  if (error) throw error
}

async function addClient(data) {
  const { error } = await db.from('clients').insert(data)
  if (error) throw error
}

// TASKS
async function getTasks(clientId = null) {
  let query = db.from('tasks').select('*, clients(name)').order('created_at')
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return data
}

async function getUrgentTasks() {
  const { data, error } = await db
    .from('tasks')
    .select('*, clients(name)')
    .eq('is_urgent', true)
    .eq('is_done', false)
    .order('created_at')
  if (error) throw error
  return data
}

async function getThisWeekTasks() {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, error } = await db
    .from('tasks')
    .select('*, clients(name)')
    .eq('is_done', false)
    .eq('is_urgent', false)
    .lte('due_date', nextWeek)
    .gte('due_date', today)
    .order('due_date')
  if (error) throw error
  return data
}

async function toggleTask(id, isDone) {
  const updates = { is_done: isDone, done_at: isDone ? new Date().toISOString() : null }
  const { error } = await db.from('tasks').update(updates).eq('id', id)
  if (error) throw error
}

async function addTask(clientId, title, owner, dueDate, isUrgent) {
  const { error } = await db.from('tasks').insert({
    client_id: clientId, title, owner,
    due_date: dueDate || null,
    is_urgent: isUrgent
  })
  if (error) throw error
}

async function deleteTask(id) {
  const { error } = await db.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// FILES
async function getFiles(clientId) {
  const { data, error } = await db
    .from('files').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function addLink(clientId, label, url) {
  const { error } = await db.from('files').insert({ client_id: clientId, label, type: 'link', url })
  if (error) throw error
}

async function uploadFile(clientId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `${clientId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await db.storage.from('client-files').upload(path, file)
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = db.storage.from('client-files').getPublicUrl(path)
  const { error: dbError } = await db.from('files').insert({
    client_id: clientId, label: file.name, type: 'upload',
    url: publicUrl, storage_path: path, size_bytes: file.size
  })
  if (dbError) throw dbError
}

async function deleteFile(fileId, storagePath) {
  if (storagePath) {
    await db.storage.from('client-files').remove([storagePath])
  }
  const { error } = await db.from('files').delete().eq('id', fileId)
  if (error) throw error
}

// NOTES
async function getNote(clientId) {
  const { data, error } = await db.from('notes').select('*').eq('client_id', clientId).maybeSingle()
  if (error) throw error
  return data
}

async function saveNote(clientId, content) {
  const { error } = await db.from('notes').upsert({ client_id: clientId, content, updated_at: new Date().toISOString() }, { onConflict: 'client_id' })
  if (error) throw error
}

// PAYMENTS
async function getPaymentsDue() {
  const today = new Date().toISOString().split('T')[0]
  const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, error } = await db
    .from('payments')
    .select('*, clients(name)')
    .eq('status', 'pending')
    .lte('due_date', twoWeeks)
    .gte('due_date', today)
    .order('due_date')
  if (error) throw error
  return data
}

async function markPaymentPaid(id) {
  const { error } = await db.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// PIPELINE
async function getPipeline() {
  const { data, error } = await db.from('pipeline').select('*').order('created_at')
  if (error) throw error
  return data
}

async function updateProspect(id, updates) {
  const { error } = await db.from('pipeline').update(updates).eq('id', id)
  if (error) throw error
}

async function addProspect(data) {
  const { error } = await db.from('pipeline').insert(data)
  if (error) throw error
}

// MRR helpers
async function getMRR() {
  const clients = await getClients('active')
  return clients.reduce((sum, c) => sum + (c.monthly_value || 0), 0)
}

// CLIENT PORTAL
async function getClientUserProfile() {
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const { data, error } = await db
    .from('client_users').select('client_id')
    .eq('auth_user_id', user.id).maybeSingle()
  if (error) throw error
  return data  // null = agency user, { client_id } = client
}

async function getClientPortalData(clientId) {
  const [clientRes, tasksRes, filesRes, noteRes, paymentsRes] = await Promise.all([
    db.from('clients').select('*').eq('id', clientId).single(),
    db.from('tasks').select('*').eq('client_id', clientId).eq('is_done', false).order('created_at'),
    db.from('files').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    db.from('notes').select('*').eq('client_id', clientId).maybeSingle(),
    db.from('payments').select('*').eq('client_id', clientId).eq('status', 'pending').order('due_date').limit(1)
  ])
  if (clientRes.error) throw clientRes.error
  return {
    client:  clientRes.data,
    tasks:   tasksRes.data  || [],
    files:   filesRes.data  || [],
    note:    noteRes.data,
    payment: paymentsRes.data?.[0] || null
  }
}
