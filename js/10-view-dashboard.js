/**
 * @file js/10-view-dashboard.js
 * @description Dashboard view — KPI stats + 12-month revenue chart + recent invoices
 */

async function renderDashboard() {
  const invoices = await loadInvoices();
  state.data.invoices = invoices;

  const total = invoices.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
  const paid = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total_ttc || 0), 0);
  const unpaid = total - paid;

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = invoices
    .filter(i => i.date && i.date.startsWith(thisMonthKey))
    .reduce((s, i) => s + Number(i.total_ttc || 0), 0);

  $('content').innerHTML = `
    <div class="stats">
      <div class="stat" data-color="blue">
        <div class="label">Factures totales</div>
        <div class="value">${invoices.length}</div>
        <div class="sub">Toutes périodes</div>
      </div>
      <div class="stat" data-color="green">
        <div class="label">CA (TTC)</div>
        <div class="value">${fmt3(total)}</div>
        <div class="sub">DT</div>
      </div>
      <div class="stat" data-color="amber">
        <div class="label">Impayé</div>
        <div class="value">${fmt3(unpaid)}</div>
        <div class="sub">DT</div>
      </div>
      <div class="stat" data-color="red">
        <div class="label">Ce mois-ci</div>
        <div class="value">${fmt3(thisMonth)}</div>
        <div class="sub">DT TTC</div>
      </div>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header"><h2>Évolution mensuelle (12 derniers mois)</h2></div>
        <div class="card-body"><div class="chart-container"><canvas id="dash-chart"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Dernières factures</h2></div>
        <div class="card-body-compact table-wrap">
          <table>
            <thead><tr><th>N°</th><th>Client</th><th class="num">TTC</th></tr></thead>
            <tbody>
              ${invoices.slice(0, 8).map(i => `
                <tr onclick="openInvoice('${i.id}')" style="cursor:pointer">
                  <td><strong>${escapeHTML(i.number)}</strong></td>
                  <td>${escapeHTML(i.client_name)}</td>
                  <td class="num">${fmt3(i.total_ttc)}</td>
                </tr>
              `).join('') || `<tr><td colspan="3" class="empty-state"><p>Aucune facture</p></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Load Chart.js and render chart
  await loadChartJs();
  const ctx = $('dash-chart');
  if (!ctx) return;

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    };
  });

  const values = months.map(m =>
    invoices
      .filter(inv => inv.date && inv.date.startsWith(m.key))
      .reduce((s, inv) => s + Number(inv.total_ttc || 0), 0)
  );

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(m => m.label),
      datasets: [{
        label: 'CA TTC (DT)',
        data: values,
        backgroundColor: '#1E4C8A',
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}
