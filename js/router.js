// router.js — hash-based SPA routing

const routes = {
  'today': renderToday,
  'clients': renderClients,
  'pipeline': renderPipeline,
  'warroom': renderWarRoom,
}

async function navigate(hash) {
  const content = document.getElementById('tab-content')
  content.innerHTML = '<div class="loading">LOADING...</div>'

  const [tab, clientId, subtab] = hash.replace('#', '').split('/')

  // Update active state on all nav-tab elements (bottom nav + sidebar)
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const btnTab = btn.dataset.tab
    btn.classList.toggle('active', btnTab === tab || (btnTab === 'clients' && tab === 'clients'))
  })

  if (tab === 'clients' && clientId) {
    await renderClientDetail(clientId, subtab || 'overview')
    return
  }

  const renderer = routes[tab] || renderToday
  await renderer()
}

window.addEventListener('hashchange', () => {
  navigate(location.hash || '#today')
})

// Wire up all nav-tab buttons (bottom nav + sidebar)
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    location.hash = '#' + btn.dataset.tab
  })
})

// Wire sidebar logout button
const sidebarLogout = document.getElementById('logout-btn-sidebar')
if (sidebarLogout) {
  sidebarLogout.addEventListener('click', () => {
    document.getElementById('logout-btn').click()
  })
}
