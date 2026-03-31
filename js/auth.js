// auth.js — login, logout, session check

async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

async function signOut() {
  await db.auth.signOut()
}

async function getSession() {
  const { data } = await db.auth.getSession()
  return data.session
}

// Wire up login form
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn')
  const loginError = document.getElementById('login-error')

  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim()
    const password = document.getElementById('login-password').value
    loginBtn.textContent = 'Signing in...'
    loginBtn.disabled = true
    loginError.classList.add('hidden')

    try {
      await signIn(email, password)
      showApp()
    } catch (err) {
      loginError.textContent = 'Invalid email or password'
      loginError.classList.remove('hidden')
    } finally {
      loginBtn.textContent = 'Sign in'
      loginBtn.disabled = false
    }
  })

  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click()
  })

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut()
    showLogin()
  })
})

function showApp() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('app').classList.remove('hidden')
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  if (!location.hash || location.hash === '#') location.hash = '#today'
}

function showLogin() {
  document.getElementById('app').classList.add('hidden')
  document.getElementById('login-screen').classList.remove('hidden')
  location.hash = ''
}

// On page load: check if already logged in
window.addEventListener('load', async () => {
  const session = await getSession()
  if (session) {
    showApp()
  } else {
    document.getElementById('login-screen').classList.remove('hidden')
  }
})
