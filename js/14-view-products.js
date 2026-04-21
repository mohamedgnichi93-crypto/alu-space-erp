/**
 * @file js/14-view-products.js
 * @description Products / stock list with search, add, edit, delete
 */

const debouncedFilterProducts = debounce(filterProducts, 300);

async function renderProducts() {
  $('page-actions').innerHTML = `<button class="btn btn-primary" onclick="editProduct()">+ Nouveau produit</button>`;
  const rows = await loadProducts();
  state.data.products = rows;

  $('content').innerHTML = `
    <div class="card">
      <div class="filters">
        <div class="search-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="prod-search" placeholder="Rechercher..." oninput="debouncedFilterProducts()">
        </div>
      </div>
      <div class="card-body-compact table-wrap">
        <table>
          <thead><tr>
            <th>Désignation</th><th class="num">Prix HT (DT)</th>
            <th class="num">Stock</th><th class="num">Alerte</th><th></th>
          </tr></thead>
          <tbody id="prod-tbody">${renderProductRows(rows)}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProductRows(rows) {
  if (!rows.length) return `
    <tr><td colspan="5">
      <div class="empty-state">
        <h3>Aucun produit</h3>
        <p>Ajoutez vos produits</p>
      </div>
    </td></tr>`;
  return rows.map(p => {
    const low = (p.stock !== null && p.low_stock !== null && p.stock <= p.low_stock);
    return `
      <tr>
        <td><strong>${escapeHTML(p.designation)}</strong></td>
        <td class="num">${fmt3(p.price)}</td>
        <td class="num">${p.stock !== null ? p.stock : '—'} ${low ? '<span class="badge badge-red" style="margin-left:6px">Stock bas</span>' : ''}</td>
        <td class="num">${p.low_stock !== null ? p.low_stock : '—'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" aria-label="Modifier" onclick="editProduct('${p.id}')">✎</button>
          <button class="btn btn-ghost btn-sm" aria-label="Supprimer" onclick="deleteProduct('${p.id}','${escapeHTML(p.designation).replace(/'/g, "\\'")}')">✕</button>
        </td>
      </tr>`;
  }).join('');
}

function filterProducts() {
  const q = ($('prod-search')?.value || '').toLowerCase();
  let rows = state.data.products.slice();
  if (q) rows = rows.filter(p => p.designation.toLowerCase().includes(q));
  $('prod-tbody').innerHTML = renderProductRows(rows);
}

function editProduct(id) {
  const p = id ? state.data.products.find(x => x.id === id) : { designation: '', price: 0, stock: '', low_stock: '' };
  if (id && !p) return;
  openModal(`
    <div class="modal-header"><h3>${id ? 'Modifier' : 'Nouveau'} produit</h3></div>
    <div class="modal-body">
      <div class="field"><label>Désignation</label><textarea id="p-desig" rows="2">${escapeHTML(p.designation)}</textarea></div>
      <div class="form-row-3">
        <div class="field"><label>Prix HT (DT)</label><input type="number" step="any" id="p-price" value="${p.price}"></div>
        <div class="field"><label>Stock (optionnel)</label><input type="number" step="any" id="p-stock" value="${p.stock || ''}"></div>
        <div class="field"><label>Alerte</label><input type="number" step="any" id="p-low" value="${p.low_stock || ''}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveProduct('${id || ''}')">Enregistrer</button>
    </div>
  `);
}

async function saveProduct(id) {
  const designation = $('p-desig').value.trim();
  if (!designation) { toast('Désignation requise', 'error'); return; }
  const payload = {
    designation,
    price: parseFloat($('p-price').value) || 0,
    stock: $('p-stock').value === '' ? null : parseFloat($('p-stock').value),
    low_stock: $('p-low').value === '' ? null : parseFloat($('p-low').value),
  };
  try {
    if (id) {
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      await logAction('product.update', 'product', id, designation);
    } else {
      payload.workspace_id = state.workspace.id;
      payload.created_by = state.user.id;
      const { data: newP, error } = await supabase.from('products').insert(payload).select().single();
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      await logAction('product.create', 'product', newP.id, designation);
    }
    closeModal();
    toast('Produit enregistré', 'success');
    renderProducts();
  } catch (e) {
    console.error('saveProduct', e);
    toast('Erreur inattendue', 'error');
  }
}

async function deleteProduct(id, name) {
  confirmModal('Supprimer produit', `Supprimer <strong>${escapeHTML(name)}</strong> ?`, async () => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) { toast('Erreur: ' + error.message, 'error'); return; }
      await logAction('product.delete', 'product', id, name);
      toast('Produit supprimé', 'success');
      renderProducts();
    } catch (e) {
      console.error('deleteProduct', e);
      toast('Erreur inattendue', 'error');
    }
  }, true);
}
