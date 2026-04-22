// ==================== AUTHENTICATION ====================

// Login: accept any email + password "AluSpace2026" → direct login
async function doLogin() {
  const emailInput = $('login-email');
  const passInput  = $('login-password');
  const errEl      = $('login-error');

  const email    = emailInput ? emailInput.value.trim() : '';
  const password = passInput  ? passInput.value : '';

  if (!email) {
    if (errEl) { errEl.textContent = 'Veuillez entrer votre adresse email.'; errEl.style.display = 'block'; }
    return;
  }

  if (password !== 'AluSpace2026') {
    if (errEl) { errEl.textContent = 'Mot de passe incorrect.'; errEl.style.display = 'block'; }
    return;
  }

  if (errEl) errEl.style.display = 'none';

  const btn = document.querySelector('#auth-screen button[onclick*="doLogin"]') ||
              document.querySelector('#auth-screen .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Connexion...'; }

  try {
    // Direct login with shared account
    const { error } = await supabase.auth.signInWithPassword({
      email: 'mohamedgnichi93@gmail.com',
      password: 'AluSpace2026'
    });

    if (error) {
      if (errEl) { errEl.textContent = 'Erreur de connexion. Réessayez.'; errEl.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
      return;
    }

    // Store user email for identification
    localStorage.setItem('userEmail', email);
    const { data: { user } } = await supabase.auth.getUser(); state.user = user; await postLoginFlow();

  } catch (e) {
    if (errEl) { errEl.textContent = 'Erreur réseau. Vérifiez votre connexion.'; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
  }
}

// Login form: submit on Enter key
$('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
