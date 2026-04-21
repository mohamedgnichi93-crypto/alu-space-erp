/**
 * @file js/16-view-audit.js
 * @description Audit log view — shows all recent user actions
 */

const ACTION_LABELS = {
  'invoice.create':   '📄 Création facture',
  'invoice.update':   '✎ Modification facture',
  'invoice.delete':   '🗑️ Suppression facture',
  'invoice.pdf':      '📥 Téléchargement PDF',
  'client.create':    '👤 Ajout client',
  'client.update':    '✎ Modification client',
  'client.delete':    '🗑️ Suppression client',
  'product.create':   '📦 Ajout produit',
  'product.update':   '✎ Modification produit',
  'product.delete':   '🗑️ Suppression produit',
  'workspace.create': '🏢 Création espace',
  'workspace.update': '⚙️ Modification paramètres',
};

async function renderAudit() {
  let logs = [];
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('workspace_id', state.workspace.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { toast('Erreur: ' + error.message, 'error'); }
    else logs = data || [];
  } catch (e) {
    console.error('renderAudit', e);
  }

  $('content').innerHTML = `
    <div class="card">
      <div class="card-header"><h2>Historique (${logs.length})</h2></div>
      <div>
        ${logs.map(l => `
          <div class="audit-row">
            <div style="width:32px;height:32px;border-radius:50%;background:#1E4C8A;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">
              ${escapeHTML((l.user_name || '?')[0].toUpperCase())}
            </div>
            <div style="flex:1;min-width:0">
              <div>
                <span class="audit-action">${escapeHTML(l.user_name || '?')}</span>
                · ${ACTION_LABELS[l.action] || escapeHTML(l.action)}
                ${l.entity_label ? ` <strong>${escapeHTML(l.entity_label)}</strong>` : ''}
              </div>
              <div class="audit-time">
                ${fmtDateTime(l.created_at)}
                ${l.user_email ? ' · ' + escapeHTML(l.user_email) : ''}
              </div>
            </div>
          </div>
        `).join('') || `<div class="empty-state"><p>Aucune activité</p></div>`}
      </div>
    </div>
  `;
}
