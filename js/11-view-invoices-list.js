/**
 * @file js/11-view-invoices-list.js
 * @description Invoice list view with search/filter + CRUD actions
 * Includes debounced search for performance
 */

const debouncedFilterInvoices = debounce(filterInvoices, 300);

async function renderInvoicesList() {
  $('page-actions').innerHTML = `
    <button class="btn btn-primary" onclick="newInvoice()">+ Nouvelle facture</button>
  `;

  const invoices = await loadInvoices();
  state.data.invoices = invoices;

  $('content').innerHTML = `
    <div class="card">
      <div class="filters">
        <div class="search-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="inv-search" placeholder="Rechercher N°, client..." oninput="debouncedFilterInvoices()">
        </div>
        <select id="inv-status" style="padding:8px 12px;border-radius:6px;border:1px solid var(--border);font:inherit;font-size:13.5px;" onchange="filterInvoices()">
          <option value="">Tous statuts</option>
          <option value="paid">Payée</option>
          <option value="partial">Partielle</option>
          <option value="unpaid">Impayée</option>
        </select>
      </div>
      <div class="card-body-compact table-wrap">
        <table id="inv-table">
          <thead><tr>
            <th>N° Facture</th><th>Date</th><th>Client</th><th>Statut</th>
            <th class="num">HT</th><th class="num">TTC</th><th style="width:170px"></th>
          </tr></thead>
          <tbody id="inv-tbody">${renderInvoiceRows(invoices)}</tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Renders invoice table rows HTML
 * @param {Object[]} rows
 * @returns {string}
 */
function renderInvoiceRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="7"><div class="empty-state"><h3>Aucune facture</h3><p>Créez votre première facture avec le bouton en haut à droite</p></div></td></tr>`;
  }

  const statusBadges = {
    paid: '<span class="badge badge-green">Payée</span>',
    partial: '<span class="badge badge-amber">Partielle</span>',
    unpaid: '<span class="badge badge-red">Impayée</span>',
  };

  return rows.map(i => `
    <tr>
      <td><strong>${escapeHTML(i.number)}</strong></td>
      <td>${fmtDate(i.date)}</td>
      <td>${escapeHTML(i.client_name)}</td>
      <td>${statusBadges[i.payment_status || 'unpaid']}</td>
      <td class="num">${fmt3(i.total_ht)}</td>
      <td class="num"><strong>${fmt3(i.total_ttc)}</strong></td>
      <td>
        <button class="btn btn-ghost btn-sm" aria-label="Modifier" onclick="openInvoice('${i.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" aria-label="Télécharger PDF" onclick="downloadInvoicePDF('${i.id}')">PDF</button>
        <button class="btn btn-ghost btn-sm" aria-label="Supprimer" onclick="deleteInvoice('${i.id}','${escapeHTML(i.number)}')">✕</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Filters and re-renders invoice table based on search + status filters
 */
function filterInvoices() {
  const q = ($('inv-search')?.value || '').toLowerCase();
  const s = $('inv-status')?.value;
  let rows = state.data.invoices.slice();

  if (q) {
    rows = rows.filter(i =>
      (i.number + ' ' + i.client_name + ' ' + (i.client_cin || '') + ' ' + (i.client_tel || ''))
        .toLowerCase().includes(q)
    );
  }

  if (s) {
    rows = rows.filter(i => (i.payment_status || 'unpaid') === s);
  }

  $('inv-tbody').innerHTML = renderInvoiceRows(rows);
}

/**
 * Deletes an invoice after confirmation
 * @param {string} id - Invoice UUID
 * @param {string} number - Invoice number (for display)
 */
async function deleteInvoice(id, number) {
  confirmModal(
    'Supprimer la facture',
    `Supprimer la facture <strong>${escapeHTML(number)}</strong> ? Cette action est irréversible.`,
    async () => {
      try {
        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (error) { toast('Erreur: ' + error.message, 'error'); return; }
        await logAction('invoice.delete', 'invoice', id, number);
        toast('Facture supprimée', 'success');
        renderInvoicesList();
      } catch (e) {
        console.error('deleteInvoice', e);
        toast('Erreur inattendue', 'error');
      }
    },
    true
  );
}
