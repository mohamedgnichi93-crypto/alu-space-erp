/**
 * @file js/12-view-invoice-editor.js
 * @description Invoice creation and editing — forms, line items, autocomplete, save logic
 * KEY FIXES:
 * - Double-click guard on save (savingInvoice flag)
 * - In-place product update (no full re-render, preserves focus)
 * - Debounced product autocomplete
 */

let currentInvoice = null;
let savingInvoice = false;
const debouncedProductAutocomplete = debounce(productAutocomplete, 200);

/**
 * Initialises a new blank invoice
 */
async function newInvoice() {
  const prefix = state.workspace.invoice_prefix || String(new Date().getFullYear());
  const seq = state.workspace.next_seq || 1;
  const number = prefix + String(seq).padStart(4, '0');

  currentInvoice = {
    id: null,
    number,
    date: todayISO(),
    client_id: null,
    client_name: '',
    client_cin: '',
    client_tel: '',
    client_adresse: '',
    items: [{ tempId: uid(), designation: '', qte: 1, pu: 0 }],
    payment_status: 'unpaid',
    reglement: '',
    notes: '',
    isNew: true,
  };
  await renderInvoiceEditor();
}

/**
 * Loads an existing invoice and opens it in the editor
 * @param {string} id
 */
async function openInvoice(id) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', id)
      .single();
    if (error) { toast('Erreur: ' + error.message, 'error'); return; }

    currentInvoice = {
      ...data,
      items: (data.invoice_items || [])
        .sort((a, b) => a.position - b.position)
        .map(it => ({
          id: it.id,
          tempId: uid(),
          designation: it.designation,
          qte: Number(it.qte),
          pu: Number(it.pu),
          product_id: it.product_id,
        })),
      isNew: false,
    };
    if (currentInvoice.items.length === 0) {
      currentInvoice.items.push({ tempId: uid(), designation: '', qte: 1, pu: 0 });
    }
    await renderInvoiceEditor();
  } catch (e) {
    console.error('openInvoice', e);
    toast('Erreur inattendue', 'error');
  }
}

async function renderInvoiceEditor() {
  const inv = currentInvoice;
  if (state.data.clients.length === 0) state.data.clients = await loadClients();
  if (state.data.products.length === 0) state.data.products = await loadProducts();

  $('page-title').textContent = inv.isNew ? 'Nouvelle facture' : `Facture ${escapeHTML(inv.number)}`;
  $('page-actions').innerHTML = `
    <button class="btn btn-ghost" onclick="render('invoices')">← Retour</button>
    ${!inv.isNew ? `<button class="btn btn-ghost" onclick="downloadInvoicePDF('${inv.id}')">📄 PDF</button>` : ''}
    <button class="btn btn-primary" id="save-btn" onclick="saveInvoice()" aria-label="Enregistrer la facture">💾 Enregistrer</button>
  `;

  $('content').innerHTML = `
    <div class="card">
      <div class="card-body">
        <div class="form-row-3">
          <div class="field">
            <label>N° Facture</label>
            <input type="text" id="f-number" value="${escapeHTML(inv.number)}">
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" id="f-date" value="${inv.date || todayISO()}">
          </div>
          <div class="field">
            <label>Statut paiement</label>
            <select id="f-status">
              <option value="unpaid" ${inv.payment_status === 'unpaid' ? 'selected' : ''}>Impayée</option>
              <option value="partial" ${inv.payment_status === 'partial' ? 'selected' : ''}>Partiellement payée</option>
              <option value="paid" ${inv.payment_status === 'paid' ? 'selected' : ''}>Payée</option>
            </select>
          </div>
        </div>
        <h3 style="margin:20px 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-2)">Client</h3>
        <div class="form-grid">
          <div class="field autocomplete">
            <label>Nom client</label>
            <input type="text" id="f-client-name" value="${escapeHTML(inv.client_name || '')}" oninput="clientAutocomplete(this.value)" autocomplete="off">
            <div class="autocomplete-list" id="client-ac"></div>
          </div>
          <div class="field">
            <label>CIN</label>
            <input type="text" id="f-client-cin" value="${escapeHTML(inv.client_cin || '')}">
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Téléphone</label>
            <input type="text" id="f-client-tel" value="${escapeHTML(inv.client_tel || '')}">
          </div>
          <div class="field">
            <label>Adresse</label>
            <input type="text" id="f-client-adresse" value="${escapeHTML(inv.client_adresse || '')}">
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header">
        <h2>Désignations</h2>
        <button class="btn btn-ghost btn-sm" onclick="addInvoiceLine()">+ Ajouter une ligne</button>
      </div>
      <div class="card-body">
        <div class="table-wrap">
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Désignation</th>
                <th class="col-num">Qte</th>
                <th class="col-money">P.U HT (DT)</th>
                <th class="col-money">P.T HT (DT)</th>
                <th class="col-action"></th>
              </tr>
            </thead>
            <tbody id="inv-lines"></tbody>
          </table>
        </div>
        <div class="totals-grid">
          <div class="field">
            <label>Règlement</label>
            <input type="text" id="f-reglement" value="${escapeHTML(inv.reglement || '')}" placeholder="ex: paiement par espèce / chèque 12345">
            <div class="field mt-3">
              <label>Notes internes (non imprimées)</label>
              <textarea id="f-notes" rows="2">${escapeHTML(inv.notes || '')}</textarea>
            </div>
          </div>
          <div class="totals-list" id="totals-box"></div>
        </div>
      </div>
    </div>
  `;

  renderInvoiceLines();
  updateTotals();
}

function renderInvoiceLines() {
  $('inv-lines').innerHTML = currentInvoice.items.map((it, idx) => `
    <tr data-idx="${idx}">
      <td>
        <div class="autocomplete">
          <textarea oninput="updateLine(${idx},'designation',this.value); debouncedProductAutocomplete(${idx}, this.value)" rows="1" autocomplete="off">${escapeHTML(it.designation || '')}</textarea>
          <div class="autocomplete-list" id="prod-ac-${idx}"></div>
        </div>
      </td>
      <td><input type="number" step="any" min="0" value="${it.qte}" oninput="updateLine(${idx},'qte',this.value)"></td>
      <td><input type="number" step="any" min="0" value="${it.pu}" oninput="updateLine(${idx},'pu',this.value)"></td>
      <td><input type="text" class="num pt-cell" value="${fmt3((Number(it.qte) || 0) * (Number(it.pu) || 0))}" readonly style="background:var(--surface-2);"></td>
      <td><button class="btn btn-ghost btn-icon btn-sm" aria-label="Supprimer" onclick="removeInvoiceLine(${idx})">✕</button></td>
    </tr>
  `).join('');
}

/**
 * Updates a single field in currentInvoice.items[idx] without full re-render
 * Preserves focus on currently active input
 * @param {number} idx
 * @param {'designation'|'qte'|'pu'} field
 * @param {string} value
 */
function updateLine(idx, field, value) {
  const it = currentInvoice.items[idx];
  if (field === 'qte' || field === 'pu') value = parseFloat(value) || 0;
  it[field] = value;

  const row = document.querySelector(`#inv-lines tr[data-idx="${idx}"]`);
  if (row) {
    const ptCell = row.querySelector('.pt-cell');
    if (ptCell) ptCell.value = fmt3((Number(it.qte) || 0) * (Number(it.pu) || 0));
  }
  updateTotals();
}

function addInvoiceLine() {
  currentInvoice.items.push({ tempId: uid(), designation: '', qte: 1, pu: 0 });
  renderInvoiceLines();
  updateTotals();
}

function removeInvoiceLine(idx) {
  if (currentInvoice.items.length === 1) {
    currentInvoice.items[0] = { tempId: uid(), designation: '', qte: 1, pu: 0 };
  } else {
    currentInvoice.items.splice(idx, 1);
  }
  renderInvoiceLines();
  updateTotals();
}

function updateTotals() {
  const t = computeTotalsFor(currentInvoice.items);
  currentInvoice.totals = t;
  const box = $('totals-box');
  if (!box) return;
  const ws = state.workspace;
  box.innerHTML = `
    <div class="totals-row"><span>TOTAL HT</span><span class="val">${fmt3(t.ht)}</span></div>
    <div class="totals-row"><span>FODEC ${ws.tax_fodec}%</span><span class="val">${fmt3(t.fodec)}</span></div>
    <div class="totals-row"><span>TOTAL NET HT</span><span class="val">${fmt3(t.netHT)}</span></div>
    <div class="totals-row"><span>TVA ${ws.tax_tva}%</span><span class="val">${fmt3(t.tva)}</span></div>
    <div class="totals-row"><span>TIMBRE</span><span class="val">${fmt3(t.timbre)}</span></div>
    <div class="totals-row total-ttc"><span>TOTAL TTC</span><span class="val">${fmt3(t.ttc)}</span></div>
    <div class="text-sm text-muted mt-2" style="font-style:italic;line-height:1.5">${num2wordsFR(t.ttc)}</div>
  `;
}

function syncInvoiceFromForm() {
  const inv = currentInvoice;
  inv.number = $('f-number').value.trim();
  inv.date = $('f-date').value;
  inv.payment_status = $('f-status').value;
  inv.client_name = $('f-client-name').value.trim();
  inv.client_cin = $('f-client-cin').value.trim();
  inv.client_tel = $('f-client-tel').value.trim();
  inv.client_adresse = $('f-client-adresse').value.trim();
  inv.reglement = $('f-reglement').value.trim();
  inv.notes = $('f-notes').value;
}

/**
 * SAVES INVOICE WITH DOUBLE-CLICK GUARD
 * Returns immediately if already saving to prevent duplicate inserts
 */
async function saveInvoice() {
  if (savingInvoice) return;

  const saveBtn = $('save-btn');
  savingInvoice = true;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Enregistrement...';
  }

  try {
    syncInvoiceFromForm();
    const inv = currentInvoice;

    if (!inv.number) { toast('N° de facture requis', 'error'); return; }
    if (!inv.client_name) { toast('Nom du client requis', 'error'); return; }
    if (inv.items.every(it => !(Number(it.qte) > 0 && Number(it.pu) > 0))) {
      toast('Ajoutez au moins une ligne valide', 'error');
      return;
    }

    const t = computeTotalsFor(inv.items);

    // Upsert client
    let clientId = inv.client_id;
    if (!clientId) {
      const existing = state.data.clients.find(c => c.name.toLowerCase() === inv.client_name.toLowerCase());
      if (existing) {
        clientId = existing.id;
        const updates = {};
        if (inv.client_cin && existing.cin !== inv.client_cin) updates.cin = inv.client_cin;
        if (inv.client_tel && existing.tel !== inv.client_tel) updates.tel = inv.client_tel;
        if (inv.client_adresse && existing.adresse !== inv.client_adresse) updates.adresse = inv.client_adresse;
        if (Object.keys(updates).length) {
          const { error: err1 } = await supabase.from('clients').update(updates).eq('id', existing.id);
          if (err1) { toast('Erreur sauvegarde: ' + err1.message, 'error'); return; }
        }
      } else {
        const { data: newC, error: err2 } = await supabase.from('clients').insert({
          workspace_id: state.workspace.id,
          created_by: state.user.id,
          name: inv.client_name,
          cin: inv.client_cin,
          tel: inv.client_tel,
          adresse: inv.client_adresse,
        }).select().single();
        if (err2) { toast('Erreur sauvegarde: ' + err2.message, 'error'); return; }
        if (newC) { clientId = newC.id; state.data.clients.push(newC); }
      }
    }

    const invoicePayload = {
      workspace_id: state.workspace.id,
      number: inv.number,
      date: inv.date,
      client_id: clientId,
      client_name: inv.client_name,
      client_cin: inv.client_cin,
      client_tel: inv.client_tel,
      client_adresse: inv.client_adresse,
      total_ht: t.ht,
      total_fodec: t.fodec,
      total_net_ht: t.netHT,
      total_tva: t.tva,
      total_timbre: t.timbre,
      total_ttc: t.ttc,
      payment_status: inv.payment_status,
      reglement: inv.reglement,
      notes: inv.notes,
      updated_by: state.user.id,
    };

    let savedId = inv.id;
    if (inv.isNew) {
      invoicePayload.created_by = state.user.id;
      const { data, error } = await supabase.from('invoices').insert(invoicePayload).select().single();
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      savedId = data.id;

      // Bump sequence
      const { error: err3 } = await supabase.from('workspaces')
        .update({ next_seq: (state.workspace.next_seq || 1) + 1 })
        .eq('id', state.workspace.id);
      if (err3) { toast('Erreur sauvegarde: ' + err3.message, 'error'); return; }
      state.workspace.next_seq = (state.workspace.next_seq || 1) + 1;

      await logAction('invoice.create', 'invoice', savedId, inv.number, { ttc: t.ttc });
    } else {
      const { error } = await supabase.from('invoices').update(invoicePayload).eq('id', inv.id);
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      const { error: err4 } = await supabase.from('invoice_items').delete().eq('invoice_id', inv.id);
      if (err4) { toast('Erreur sauvegarde: ' + err4.message, 'error'); return; }
      await logAction('invoice.update', 'invoice', inv.id, inv.number, { ttc: t.ttc });
    }

    // Insert items
    const itemsPayload = inv.items
      .filter(it => (it.designation && it.designation.trim()) || (Number(it.qte) > 0 && Number(it.pu) > 0))
      .map((it, idx) => ({
        invoice_id: savedId,
        user_id: state.user.id,
        workspace_id: state.workspace.id,
        position: idx,
        designation: it.designation || '',
        qte: Number(it.qte) || 0,
        pu: Number(it.pu) || 0,
        product_id: it.product_id || null,
      }));

    if (itemsPayload.length) {
      const { error: ie } = await supabase.from('invoice_items').insert(itemsPayload);
      if (ie) { toast('Erreur lignes: ' + ie.message, 'error'); return; }
    }

    toast('Facture enregistrée', 'success');
    render('invoices');
  } catch (e) {
    console.error('saveInvoice', e);
    toast('Erreur inattendue', 'error');
  } finally {
    savingInvoice = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '💾 Enregistrer';
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CLIENT AUTOCOMPLETE
// ──────────────────────────────────────────────────────────────────────────

function clientAutocomplete(q) {
  const ac = $('client-ac');
  if (!ac) return;
  q = q.trim().toLowerCase();
  if (!q) { ac.classList.remove('show'); return; }

  const matches = state.data.clients
    .filter(c => c.name.toLowerCase().includes(q) || (c.cin || '').includes(q))
    .slice(0, 6);

  if (!matches.length) { ac.classList.remove('show'); return; }

  ac.innerHTML = matches.map(c => `
    <div class="autocomplete-item" onclick="pickClient('${c.id}')">
      <div class="primary">${escapeHTML(c.name)}</div>
      <div class="secondary">${c.cin ? 'CIN ' + c.cin : ''}${c.tel ? ' · ' + c.tel : ''}${c.adresse ? ' · ' + c.adresse : ''}</div>
    </div>
  `).join('');
  ac.classList.add('show');
}

function pickClient(id) {
  const c = state.data.clients.find(x => x.id === id);
  if (!c) return;
  $('f-client-name').value = c.name;
  $('f-client-cin').value = c.cin || '';
  $('f-client-tel').value = c.tel || '';
  $('f-client-adresse').value = c.adresse || '';
  currentInvoice.client_id = c.id;
  $('client-ac').classList.remove('show');
}

// ──────────────────────────────────────────────────────────────────────────
// PRODUCT AUTOCOMPLETE — DEBOUNCED
// ──────────────────────────────────────────────────────────────────────────

function productAutocomplete(idx, q) {
  const ac = $('prod-ac-' + idx);
  if (!ac) return;
  q = q.trim().toLowerCase();
  if (!q || q.length < 2) { ac.classList.remove('show'); return; }

  const matches = state.data.products
    .filter(p => p.designation.toLowerCase().includes(q))
    .slice(0, 6);

  if (!matches.length) { ac.classList.remove('show'); return; }

  ac.innerHTML = matches.map(p => `
    <div class="autocomplete-item" onclick="pickProduct(${idx}, '${p.id}')">
      <div class="primary">${escapeHTML(p.designation)}</div>
      <div class="secondary">${fmt3(p.price)} DT${p.stock !== null ? ' · Stock: ' + p.stock : ''}</div>
    </div>
  `).join('');
  ac.classList.add('show');
}

/**
 * PICKS A PRODUCT — IN-PLACE UPDATE, NO FOCUS LOSS
 * Updates only the affected row's cells without re-rendering the entire table
 * This preserves focus on currently active input
 */
function pickProduct(idx, id) {
  const p = state.data.products.find(x => x.id === id);
  if (!p) return;

  currentInvoice.items[idx].designation = p.designation;
  currentInvoice.items[idx].pu = Number(p.price);
  currentInvoice.items[idx].product_id = p.id;

  // In-place DOM update — never calls renderInvoiceLines()
  const row = document.querySelector(`#inv-lines tr[data-idx="${idx}"]`);
  if (row) {
    const textarea = row.querySelector('textarea');
    const numInputs = row.querySelectorAll('input[type="number"]');
    const ptCell = row.querySelector('.pt-cell');
    if (textarea) textarea.value = p.designation;
    if (numInputs[1]) numInputs[1].value = p.price; // [0]=qte, [1]=pu
    const qte = Number(currentInvoice.items[idx].qte) || 0;
    if (ptCell) ptCell.value = fmt3(qte * Number(p.price));
  }

  const ac = $('prod-ac-' + idx);
  if (ac) ac.classList.remove('show');
  updateTotals();
}
