/**
 * @file js/03-state.js
 * @description Global application state — single source of truth
 * - User/session information
 * - Current workspace (single shared account)
 * - Cached data (invoices, clients, products)
 * - Current view
 */

const state = {
  user: null,              // Authenticated user object from Supabase
  profile: null,           // User profile from DB
  workspace: null,         // Single shared workspace
  role: null,              // User role in workspace (owner/admin/user)
  view: 'dashboard',       // Currently rendered view
  data: {
    invoices: [],
    clients: [],
    products: [],
  },
  loading: false,
};

// ──────────────────────────────────────────────────────────────────────────
// BOOT & SESSION MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────

/**
 * Application entry point — runs on page load
 * Checks for an existing Supabase session and either shows login or enters the app
 */
async function boot() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return showAuth();
    }
    state.user = session.user;
    await postLoginFlow();
  } catch (e) {
    console.error('boot error', e);
    showAuth();
  }
}

/**
 * After successful login (fresh or auto-session from stored token):
 * Loads user profile and the shared workspace, then enters the app
 *
 * For single-account model:
 * - User will always have exactly one active workspace membership
 * - If no workspace found, shows an error (shouldn't happen in production)
 */
async function postLoginFlow() {
  try {
    // Load user profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      toast('Erreur: profil utilisateur introuvable', 'error');
      return doLogout();
    }
    state.profile = profile;

    // Load workspace membership (single shared account → always exactly one active)
    const { data: members, error: membersErr } = await supabase
      .from('workspace_members')
      .select('*, workspaces(*)')
      .eq('user_id', state.user.id)
      .eq('status', 'active');

    if (membersErr || !members || members.length === 0) {
      showAuth();
      $('login-error').textContent = "Aucun espace de travail configuré. Exécutez supabase/03_bootstrap_shared_account.sql.";
      $('login-error').style.display = 'block';
      return;
    }

    // Take first (and only) active workspace
    state.workspace = members[0].workspaces;
    state.role = members[0].role;
    enterApp();
  } catch (e) {
    console.error('postLoginFlow error', e);
    showAuth();
  }
}

/**
 * Shows the login screen
 */
function showAuth() {
  $('loading-screen').style.display = 'none';
  $('auth-screen').style.display = 'flex';
  $('app').style.display = 'none';
}

/**
 * Enters the main application
 * - Updates sidebar with user + workspace info
 * - Renders dashboard by default
 */
function enterApp() {
  $('loading-screen').style.display = 'none';
  $('auth-screen').style.display = 'none';
  $('app').style.display = 'grid';

  // Populate sidebar
  $('user-name').textContent = state.profile.full_name;
  $('user-avatar').textContent = state.profile.full_name[0].toUpperCase();
  $('user-role').textContent = state.role;
  $('sidebar-company-name').textContent = state.workspace.company_name || 'ALU SPACE';
  $('sidebar-ws-name').textContent = state.workspace.name;

  // Start with dashboard
  render('dashboard');
}

/**
 * Signs out user and returns to login screen
 */
async function doLogout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('signOut error', e);
  }
  state.user = null;
  state.profile = null;
  state.workspace = null;
  state.role = null;
  state.data.invoices = [];
  state.data.clients = [];
  state.data.products = [];
  showAuth();
}
