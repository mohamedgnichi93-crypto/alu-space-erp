/**
 * @file js/06-data.js
 * @description Data fetching functions + financial computation
 */

/**
 * Fetches all invoices for the current workspace, with line items
 * Ordered by date descending
 * @returns {Promise<Object[]>}
 */
async function loadInvoices() {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('workspace_id', state.workspace.id)
      .order('date', { ascending: false });
    if (error) {
      toast('Erreur chargement factures: ' + error.message, 'error');
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('loadInvoices', e);
    return [];
  }
}

/**
 * Fetches all clients for the current workspace
 * Ordered by name
 * @returns {Promise<Object[]>}
 */
async function loadClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('workspace_id', state.workspace.id)
      .order('name');
    if (error) {
      toast('Erreur chargement clients: ' + error.message, 'error');
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('loadClients', e);
    return [];
  }
}

/**
 * Fetches all products for the current workspace
 * Ordered by designation
 * @returns {Promise<Object[]>}
 */
async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('workspace_id', state.workspace.id)
      .order('designation');
    if (error) {
      toast('Erreur chargement produits: ' + error.message, 'error');
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('loadProducts', e);
    return [];
  }
}

/**
 * Computes invoice totals from line items using workspace tax rates
 * Formula:
 *   HT = sum of (qte * pu)
 *   FODEC = HT * (tax_fodec / 100)
 *   NET HT = HT + FODEC
 *   TVA = NET HT * (tax_tva / 100)
 *   TTC = NET HT + TVA + timbre
 * @param {Object[]} items - Array of line items with {qte, pu}
 * @returns {Object} {ht, fodec, netHT, tva, timbre, ttc}
 */
function computeTotalsFor(items) {
  const fodecPct = Number(state.workspace.tax_fodec) || 0;
  const tvaPct = Number(state.workspace.tax_tva) || 0;
  const timbre = Number(state.workspace.tax_timbre) || 0;

  const ht = (items || []).reduce((sum, it) => sum + (Number(it.qte) || 0) * (Number(it.pu) || 0), 0);
  const fodec = ht * (fodecPct / 100);
  const netHT = ht + fodec;
  const tva = netHT * (tvaPct / 100);
  const ttc = netHT + tva + timbre;

  return { ht, fodec, netHT, tva, timbre, ttc };
}
