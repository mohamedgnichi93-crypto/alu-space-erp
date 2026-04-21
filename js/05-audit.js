/**
 * @file js/05-audit.js
 * @description Audit log helper — records all user actions in the database
 */

/**
 * Inserts an audit log entry for the current user + workspace
 * Silently fails on error — audit failures must never crash the UI
 * @param {string} action - Action code (e.g., 'invoice.create', 'client.update')
 * @param {string} entity_type - Type of entity (e.g., 'invoice', 'client', 'product')
 * @param {string|null} entity_id - ID of the affected entity
 * @param {string|null} entity_label - Human-readable label (invoice number, client name, etc.)
 * @param {Object|null} details - Optional extra data (stored as JSON)
 */
async function logAction(action, entity_type, entity_id, entity_label, details = null) {
  if (!state.workspace || !state.user) return;
  try {
    await supabase.from('audit_log').insert({
      workspace_id: state.workspace.id,
      user_id: state.user.id,
      user_email: state.user.email,
      user_name: state.profile?.full_name || state.user.email,
      action,
      entity_type,
      entity_id,
      entity_label,
      details,
    });
  } catch (e) {
    console.warn('audit log failed', e);
  }
}
