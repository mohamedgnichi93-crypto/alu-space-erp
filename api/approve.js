const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token manquant');

  const { data, error } = await supabase
    .from('device_approvals')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('token', token)
    .eq('status', 'pending')
    .gte('expires_at', new Date().toISOString())
    .select()
    .single();

  if (error || !data) {
    return res.status(400).send(`
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f8f9fa;">
        <div style="max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
          <div style="font-size:48px;margin-bottom:16px;">❌</div>
          <h2 style="color:#e74c3c;">Lien invalide ou expiré</h2>
          <p style="color:#666;">Ce lien a déjà été utilisé ou a expiré (30 min).</p>
        </div>
      </body></html>
    `);
  }

  res.send(`
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f8f9fa;">
      <div style="max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
        <div style="font-size:48px;margin-bottom:16px;">✅</div>
        <h2 style="color:#27ae60;">Accès accordé</h2>
        <p style="color:#666;font-size:16px;"><strong>${data.email}</strong> peut maintenant se connecter.</p>
        <p style="color:#999;font-size:13px;margin-top:16px;">Vous pouvez fermer cette page.</p>
      </div>
    </body></html>
  `);
};
