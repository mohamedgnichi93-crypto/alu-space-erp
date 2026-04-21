// ============================================================
// ALU SPACE ERP — Configuration
// ============================================================
// Supabase project URL and publishable (anon) key.
// SAFE to expose publicly — Row Level Security policies in the
// database are what actually protect data.
// ============================================================

const SUPABASE_URL = 'https://yaoqvwxjoxsqrachrklv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__-cx0_jW_Cur4L9NiYVHsw_gWYK06AB';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// App constants
const APP_NAME = 'ALU SPACE ERP';
const DEFAULT_COMPANY = {
  company_name: 'ALU SPACE',
  company_tagline: 'Menuiserie Aluminium',
  company_address: 'LOT 125 LOTISSEMENT LAROUSSI 1EL MGHIRA - BEN AROUS - TUNIS CP: 2074 - TUNIS',
  company_tel: '53 186 611',
  company_mobile: '57 099 070',
  company_email: 'aluminium.space1@gmail.com',
  company_matricule: '1651250W/A/M/000',
  company_rib: '11 05500 01215002788 56',
  company_agence: 'BOUMHEL',
  tax_fodec: 1,
  tax_tva: 19,
  tax_timbre: 1,
  invoice_prefix: String(new Date().getFullYear()),
  next_seq: 1,
};
