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
  if (btn) { btn.disabled = true; btn.textContent = 'Vérification...'; }

  try {
    const approvalRes = await fetch('/api/request-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const approvalData = await approvalRes.json();

    if (approvalData.approved) {
      // Already approved — sign in with shared account
      const { error } = await supabase.auth.signInWithPassword({
        email: 'mohamedgnichi93@gmail.com',
        password: 'AluSpace2026'
      });
      if (error) {
        if (errEl) { errEl.textContent = 'Erreur de connexion. Réessayez.'; errEl.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
        return;
      }
      await postLoginFlow();
    } else {
      // Not yet approved — show waiting screen
      if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
      showWaitingScreen(email);
    }

  } catch (e) {
    if (errEl) { errEl.textContent = 'Erreur réseau. Vérifiez votre connexion.'; errEl.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
  }
}

function showWaitingScreen(email) {
  const authScreen = $('auth-screen');
  if (!authScreen) return;

  authScreen.innerHTML = `
    <div class="auth-card" style="text-align:center;padding:40px 32px;">
      <div style="font-size:52px;margin-bottom:16px;">⏳</div>
      <h2 style="color:var(--brand-red);margin-bottom:8px;">Demande envoyée</h2>
      <p style="color:var(--text-2);margin:0 0 8px;">Un email d'approbation a été envoyé pour :</p>
      <p style="font-size:16px;font-weight:700;color:var(--text);margin:0 0 24px;">${escapeHTML(email)}</p>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:var(--text-2);font-size:14px;">
          ⏱️ En attente de l'approbation de l'administrateur...<br>
          <span style="font-size:12px;color:var(--text-3);">Vérification automatique toutes les 5 secondes</span>
        </p>
      </div>
      <div id="approval-status" style="color:var(--text-3);font-size:13px;margin-bottom:20px;min-height:20px;"></div>
      <button 
        onclick="cancelWaiting()" 
        style="background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);padding:10px 24px;border-radius:var(--radius);cursor:pointer;font-size:14px;">
        ← Retour
      </button>
    </div>
  `;

  let attempts = 0;
  window._approvalInterval = setInterval(async () => {
    attempts++;
    const statusEl = document.getElementById('approval-status');
    if (statusEl) statusEl.textContent = `Vérification #${attempts}...`;

    try {
      const res = await fetch('/api/check-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.approved) {
        clearInterval(window._approvalInterval);
        if (statusEl) statusEl.textContent = '✅ Approuvé ! Connexion en cours...';

        const { error } = await supabase.auth.signInWithPassword({
          email: 'mohamedgnichi93@gmail.com',
          password: 'AluSpace2026'
        });
        if (!error) await postLoginFlow();
      }
    } catch(e) {
      if (document.getElementById('approval-status')) {
        document.getElementById('approval-status').textContent = 'Erreur réseau, nouvelle tentative...';
      }
    }
  }, 5000);
}

function cancelWaiting() {
  if (window._approvalInterval) {
    clearInterval(window._approvalInterval);
    window._approvalInterval = null;
  }
  showAuth();
}

// Login form: submit on Enter key
$('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// Logout button: already wired in HTML via onclick="doLogout()"
