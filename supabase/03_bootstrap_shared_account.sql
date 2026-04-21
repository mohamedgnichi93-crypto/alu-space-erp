/*
  ALU SPACE ERP — BOOTSTRAP SHARED ACCOUNT
  =========================================
  Run AFTER schema.sql.
  Edit the 4 variables below (email, password, fullname, workspace name)
  before running. Run once only.
*/

-- ================================================================
-- ALU SPACE ERP — Bootstrap Data (Optional)
-- This script is optional. The app creates workspaces on first login.
-- Run this only if you want to pre-populate test data.
-- ================================================================

-- Example: Create a test workspace
-- Uncomment to use, or leave commented if you prefer app-driven creation

/*
-- Create a workspace (owner UUID must match your auth user)
insert into public.workspaces (
  id, name, company_name, company_tagline,
  company_address, company_tel, company_email,
  company_matricule, tax_fodec, tax_tva, tax_timbre,
  invoice_prefix, next_seq, created_by
) values (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Mon Entreprise',
  'ALU SPACE SARL',
  'Menuiserie Aluminium',
  '123 Rue de la Paix, Tunis 1002',
  '+216 71 123 456',
  'info@aluspace.tn',
  '1234567',
  1.00,
  19.00,
  1.000,
  '2026',
  1,
  '00000000-0000-0000-0000-000000000001'::uuid
);

-- Add the creator as owner (replace with your actual user UUID from Supabase Auth)
insert into public.workspace_members (
  workspace_id, user_id, role, status, joined_at
) values (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'owner',
  'active',
  now()
);
*/

-- ================================================================
-- Notes for deployment:
-- 1. Run supabase/schema.sql FIRST in your Supabase SQL Editor
-- 2. Users sign up in the app (Supabase Auth handles this)
-- 3. On first login, the app calls postLoginFlow() which:
--    - Loads the user's profile
--    - Fetches workspace memberships
--    - If one workspace exists and is active, enters the app
-- 4. To manually create a workspace, uncomment the INSERT statements above
--    and replace the UUIDs with your actual auth.users.id
-- ================================================================
