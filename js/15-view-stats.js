/**
 * @file js/15-view-stats.js
 * @description Statistics dashboard — payment breakdown + top clients/products
 */

async function renderStats() {
  if (!state.data.invoices.length) state.data.invoices = await loadInvoices();
  const invoices = state.data.invoices;

  // Compute client turnover
  const clientCA = {};
  invoices.forEach(i => {
    const k = i.client_name || '—';
    clientCA[k] = (clientCA[k] || 0) + Number(i.total_ttc || 0);
  });
  const topClients = Object.entries(clientCA).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Compute product sales (from invoice line items)
  let items = [];
  try {
    const { data, error } = await supabase.from('invoice_items').select('designation, qte, pu').eq('workspace_id', state.workspace.id);
    if (error) { toast('Erreur statistiques: ' + error.message, 'error'); return; }
    items = data || [];
  } catch (e) {
    console.error('loadStats items', e);
  }

  const prodCA = {};
  items.forEach(it => {
    const k = (it.designation || '').split('\n')[0] || '—';
    if (!k || k === '—') return;
    prodCA[k] = (prodCA[k] || 0) + (Number(it.qte) || 0) * (Number(it.pu) || 0);
  });
  const topProducts = Object.entries(prodCA).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const paid = invoices.filter(i => i.payment_status === 'paid').length;
  const unpaid = invoices.filter(i => (i.payment_status || 'unpaid') === 'unpaid').length;
  const partial = invoices.filter(i => i.payment_status === 'partial').length;

  $('content').innerHTML = `
    <div class="stats">
      <div class="stat" data-color="green"><div class="label">Payées</div><div class="value">${paid}</div></div>
      <div class="stat" data-color="amber"><div class="label">Partielles</div><div class="value">${partial}</div></div>
      <div class="stat" data-color="red"><div class="label">Impayées</div><div class="value">${unpaid}</div></div>
      <div class="stat" data-color="blue"><div class="label">Clients actifs</div><div class="value">${Object.keys(clientCA).length}</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header"><h2>Top 10 Clients (CA TTC)</h2></div>
        <div class="card-body"><div class="chart-container" style="height:360px"><canvas id="chart-clients"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Top produits (CA HT)</h2></div>
        <div class="card-body-compact table-wrap">
          <table>
            <thead><tr><th>Produit</th><th class="num">CA (DT)</th></tr></thead>
            <tbody>
              ${topProducts.map(([n, v]) => `<tr><td>${escapeHTML(n)}</td><td class="num">${fmt3(v)}</td></tr>`).join('')
                || `<tr><td colspan="2" class="empty-state"><p>Aucune donnée</p></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  await loadChartJs();
  const ctx = $('chart-clients');
  if (!ctx || !topClients.length) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topClients.map(c => c[0]),
      datasets: [{ label: 'CA (DT)', data: topClients.map(c => c[1]), backgroundColor: '#4CAF50', borderRadius: 6 }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}
