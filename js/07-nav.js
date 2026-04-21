/**
 * @file js/07-nav.js
 * @description Navigation router — view switching and page rendering
 */

const VIEW_TITLES = {
  dashboard: 'Tableau de bord',
  invoices: 'Factures',
  clients: 'Clients',
  products: 'Produits / Stock',
  stats: 'Statistiques',
  audit: "Journal d'activité",
  settings: 'Paramètres',
};

function toggleMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const isOpen = sidebar.classList.toggle('open');
  backdrop.classList.toggle('show', isOpen);
  document.body.classList.toggle('menu-open', isOpen);
}

/**
 * Renders a named view
 * Updates:
 * - Navigation highlight
 * - Page title
 * - Page actions area
 * - Main content area
 * @param {string} view - View name (one of the keys above)
 */
function render(view) {
  state.view = view;

  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });

  // Update page title
  $('page-title').textContent = VIEW_TITLES[view] || '';

  // Clear page actions
  $('page-actions').innerHTML = '';

  // Render the view
  switch (view) {
    case 'dashboard':  renderDashboard();        break;
    case 'invoices':   renderInvoicesList();     break;
    case 'clients':    renderClients();          break;
    case 'products':   renderProducts();         break;
    case 'stats':      renderStats();            break;
    case 'audit':      renderAudit();            break;
    case 'settings':   renderSettings();         break;
  }
}

// Navigation click handlers
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', () => {
    render(n.dataset.view);
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('show');
    document.body.classList.remove('menu-open');
  });
});

document.getElementById('sidebar-backdrop').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('show');
  document.body.classList.remove('menu-open');
});
