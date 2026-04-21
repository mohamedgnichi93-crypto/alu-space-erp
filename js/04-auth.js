/**
 * @file js/04-auth.js
 * @description Authentication actions — login form handling
 */

/**
 * Attempts to sign in with email + password
 * Shows inline error message on failure
 * On success, calls postLoginFlow to load workspace + enter app
 */
async function doLogin() {
  try {
    const email = $('login-email').value.trim().toLowerCase();
    const password = $('login-password').value;
    const err = $('login-error');
    err.style.display = 'none';

    if (!email || !password) {
      err.textContent = 'Entrez vos identifiants.';
      err.style.display = 'block';
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      err.textContent = error.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : error.message;
      err.style.display = 'block';
      return;
    }
    state.user = data.user;
    await postLoginFlow();
  } catch (e) {
    console.error('doLogin', e);
    $('login-error').textContent = 'Erreur inattendue lors de la connexion.';
    $('login-error').style.display = 'block';
  }
}

// Login form: submit on Enter key
$('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// Logout button: already wired in HTML via onclick="doLogout()"
