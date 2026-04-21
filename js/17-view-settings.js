/**
 * @file js/17-view-settings.js
 * @description Workspace + company settings — info, logo, stamp, taxes, numbering
 */

function renderSettings() {
  const w = state.workspace;
  $('content').innerHTML = `
    <div class="card">
      <div class="card-header"><h2>Espace de travail</h2></div>
      <div class="card-body">
        <div class="field"><label>Nom</label><input id="s-name" value="${escapeHTML(w.name)}"></div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header"><h2>Société</h2></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field"><label>Nom</label><input id="s-company-name" value="${escapeHTML(w.company_name || '')}"></div>
          <div class="field"><label>Slogan</label><input id="s-company-tagline" value="${escapeHTML(w.company_tagline || '')}"></div>
        </div>
        <div class="field"><label>Adresse</label><textarea id="s-company-address" rows="2">${escapeHTML(w.company_address || '')}</textarea></div>
        <div class="form-row-3">
          <div class="field"><label>Tél</label><input id="s-company-tel" value="${escapeHTML(w.company_tel || '')}"></div>
          <div class="field"><label>Mobile</label><input id="s-company-mobile" value="${escapeHTML(w.company_mobile || '')}"></div>
          <div class="field"><label>Email</label><input id="s-company-email" value="${escapeHTML(w.company_email || '')}"></div>
        </div>
        <div class="form-row-3">
          <div class="field"><label>Matricule</label><input id="s-company-matricule" value="${escapeHTML(w.company_matricule || '')}"></div>
          <div class="field"><label>RIB</label><input id="s-company-rib" value="${escapeHTML(w.company_rib || '')}"></div>
          <div class="field"><label>Agence</label><input id="s-company-agence" value="${escapeHTML(w.company_agence || '')}"></div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Logo</label>
            <input type="file" accept="image/*" onchange="uploadImage(event,'logo_url')">
            ${w.logo_url ? `<img src="${escapeHTML(w.logo_url)}" style="max-height:60px;margin-top:8px" alt="Logo">` : ''}
          </div>
          <div class="field">
            <label>Tampon</label>
            <input type="file" accept="image/*" onchange="uploadImage(event,'stamp_url')">
            ${w.stamp_url ? `<img src="${escapeHTML(w.stamp_url)}" style="max-height:60px;margin-top:8px" alt="Tampon">` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header"><h2>Taxes & numérotation</h2></div>
      <div class="card-body">
        <div class="form-row-3">
          <div class="field"><label>FODEC %</label><input type="number" step="any" id="s-fodec" value="${w.tax_fodec}"></div>
          <div class="field"><label>TVA %</label><input type="number" step="any" id="s-tva" value="${w.tax_tva}"></div>
          <div class="field"><label>Timbre (DT)</label><input type="number" step="any" id="s-timbre" value="${w.tax_timbre}"></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Préfixe N°</label><input id="s-prefix" value="${escapeHTML(w.invoice_prefix || '')}"></div>
          <div class="field"><label>Prochain N° (séq)</label><input type="number" id="s-seq" value="${w.next_seq}"></div>
        </div>
      </div>
    </div>

    <div style="margin-top:16px">
      <button class="btn btn-primary btn-lg" onclick="saveSettings()">💾 Enregistrer</button>
    </div>
  `;
}

async function uploadImage(event, field) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Fichier trop grand (max 2 MB)', 'error'); return; }

  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${state.workspace.id}/${field}_${Date.now()}.${ext}`;

  try {
    const { error: upErr } = await supabase.storage.from('user-files').upload(path, file);
    if (upErr) { toast('Erreur upload: ' + upErr.message, 'error'); return; }

    const { data: url } = await supabase.storage.from('user-files').createSignedUrl(path, 604800);
    if (!url) { toast('Erreur génération URL', 'error'); return; }

    const { error } = await supabase.from('workspaces').update({ [field]: url.signedUrl }).eq('id', state.workspace.id);
    if (error) { toast('Erreur: ' + error.message, 'error'); return; }

    state.workspace[field] = url.signedUrl;
    toast('Image enregistrée', 'success');
    renderSettings();
  } catch (e) {
    console.error('uploadImage', e);
    toast('Erreur inattendue', 'error');
  }
}

async function saveSettings() {
  const updates = {
    name: $('s-name').value.trim(),
    company_name: $('s-company-name').value.trim(),
    company_tagline: $('s-company-tagline').value.trim(),
    company_address: $('s-company-address').value.trim(),
    company_tel: $('s-company-tel').value.trim(),
    company_mobile: $('s-company-mobile').value.trim(),
    company_email: $('s-company-email').value.trim(),
    company_matricule: $('s-company-matricule').value.trim(),
    company_rib: $('s-company-rib').value.trim(),
    company_agence: $('s-company-agence').value.trim(),
    tax_fodec: parseFloat($('s-fodec').value) || 0,
    tax_tva: parseFloat($('s-tva').value) || 0,
    tax_timbre: parseFloat($('s-timbre').value) || 0,
    invoice_prefix: $('s-prefix').value.trim(),
    next_seq: parseInt($('s-seq').value) || 1,
  };

  if (!updates.name) { toast('Nom requis', 'error'); return; }
  if (updates.tax_fodec < 0 || updates.tax_tva < 0 || updates.tax_timbre < 0) { toast('Taxes doivent être ≥ 0', 'error'); return; }
  if (updates.next_seq < 1) { toast('Séquence doit être ≥ 1', 'error'); return; }

  try {
    const { error } = await supabase.from('workspaces').update(updates).eq('id', state.workspace.id);
    if (error) { toast('Erreur: ' + error.message, 'error'); return; }
    Object.assign(state.workspace, updates);
    $('sidebar-company-name').textContent = state.workspace.company_name;
    $('sidebar-ws-name').textContent = state.workspace.name;
    await logAction('workspace.update', 'workspace', state.workspace.id, state.workspace.name);
    toast('Paramètres enregistrés', 'success');
  } catch (e) {
    console.error('saveSettings', e);
    toast('Erreur inattendue', 'error');
  }
}
