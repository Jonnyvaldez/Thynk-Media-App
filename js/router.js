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

  // Update active nav tab
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

// Wire up bottom nav
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    location.hash = '#' + btn.dataset.tab
  })
})
