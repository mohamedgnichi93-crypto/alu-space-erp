/**
 * @file js/13-view-clients.js
 * @description Clients list with search, add, edit, delete
 */

const debouncedFilterClients = debounce(filterClients, 300);

async function renderClients() {
  $('page-actions').innerHTML = `<button class="btn btn-primary" onclick="editClient()">+ Nouveau client</button>`;
  const clients = await loadClients();
  if (!state.data.invoices.length) state.data.invoices = await loadInvoices();
  state.data.clients = clients;

  $('content').innerHTML = `
    <div class="card">
      <div class="filters">
        <div class="search-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="cli-search" placeholder="Rechercher un client..." oninput="debouncedFilterClients()">
        </div>
      </div>
      <div class="card-body-compact table-wrap">
        <table>
          <thead><tr>
            <th>Nom</th><th>CIN</th><th>Téléphone</th><th>Adresse</th>
            <th class="num">Factures</th><th class="num">CA</th><th></th>
          </tr></thead>
          <tbody id="cli-tbody">${renderClientRows(clients)}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderClientRows(rows) {
  if (!rows.length) return `
    <tr><td colspan="7">
      <div class="empty-state">
        <h3>Aucun client</h3>
        <p>Les clients sont créés automatiquement à partir des factures</p>
      </div>
    </td></tr>`;

  return rows.map(c => {
    const invs = state.data.invoices.filter(i => i.client_id === c.id || (i.client_name || '').toLowerCase() === c.name.toLowerCase());
    const ca = invs.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
    return `
      <tr>
        <td><strong>${escapeHTML(c.name)}</strong></td>
        <td>${escapeHTML(c.cin || '—')}</td>
        <td>${escapeHTML(c.tel || '—')}</td>
        <td>${escapeHTML(c.adresse || '—')}</td>
        <td class="num">${invs.length}</td>
        <td class="num">${fmt3(ca)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" aria-label="Modifier" onclick="editClient('${c.id}')">✎</button>
          <button class="btn btn-ghost btn-sm" aria-label="Supprimer" onclick="deleteClient('${c.id}','${escapeHTML(c.name)}')">✕</button>
        </td>
      </tr>`;
  }).join('');
}

function filterClients() {
  const q = ($('cli-search')?.value || '').toLowerCase();
  let rows = state.data.clients.slice();
  if (q) rows = rows.filter(c => (c.name + ' ' + (c.cin || '') + ' ' + (c.tel || '') + ' ' + (c.adresse || '')).toLowerCase().includes(q));
  $('cli-tbody').innerHTML = renderClientRows(rows);
}

function editClient(id) {
  const c = id ? state.data.clients.find(x => x.id === id) : { id: '', name: '', cin: '', tel: '', adresse: '' };
  if (id && !c) return;
  openModal(`
    <div class="modal-header"><h3>${id ? 'Modifier' : 'Nouveau'} client</h3></div>
    <div class="modal-body">
      <div class="field"><label>Nom</label><input type="text" id="cli-name" value="${escapeHTML(c.name)}"></div>
      <div class="form-grid">
        <div class="field"><label>CIN</label><input type="text" id="cli-cin" value="${escapeHTML(c.cin || '')}"></div>
        <div class="field"><label>Téléphone</label><input type="text" id="cli-tel" value="${escapeHTML(c.tel || '')}"></div>
      </div>
      <div class="field"><label>Adresse</label><input type="text" id="cli-adresse" value="${escapeHTML(c.adresse || '')}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveClient('${id || ''}')">Enregistrer</button>
    </div>
  `);
}

async function saveClient(id) {
  const name = $('cli-name').value.trim();
  if (!name) { toast('Nom requis', 'error'); return; }
  const payload = {
    name,
    cin: $('cli-cin').value.trim(),
    tel: $('cli-tel').value.trim(),
    adresse: $('cli-adresse').value.trim(),
  };
  try {
    if (id) {
      const { error } = await supabase.from('clients').update(payload).eq('id', id);
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      await logAction('client.update', 'client', id, name);
    } else {
      payload.workspace_id = state.workspace.id;
      payload.created_by = state.user.id;
      const { data: newC, error } = await supabase.from('clients').insert(payload).select().single();
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      await logAction('client.create', 'client', newC.id, name);
    }
    closeModal();
    toast('Client enregistré', 'success');
    renderClients();
  } catch (e) {
    console.error('saveClient', e);
    toast('Erreur inattendue', 'error');
  }
}

async function deleteClient(id, name) {
  confirmModal('Supprimer client', `Supprimer <strong>${escapeHTML(name)}</strong> ?`, async () => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      await logAction('client.delete', 'client', id, name);
      toast('Client supprimé', 'success');
      renderClients();
    } catch (e) {
      console.error('deleteClient', e);
      toast('Erreur inattendue', 'error');
    }
  }, true);
}
