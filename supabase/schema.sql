/*
  ALU SPACE ERP — CANONICAL DATABASE SCHEMA
  ==========================================
  SETUP ORDER FOR FRESH DEPLOYMENT:
  Step 1 → Run this file (supabase/schema.sql) in Supabase SQL Editor
  Step 2 → Run supabase/03_bootstrap_shared_account.sql

  Do NOT run any other SQL files. The files 01_initial_setup.sql and
  02_team_workspace.sql are deleted — they were legacy and must not be used.
*/

-- ================================================================
-- ALU SPACE ERP — Complete Database Schema
-- Single shared account architecture
-- ================================================================

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ WORKSPACES ============
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mon entreprise',
  company_name text default 'ALU SPACE',
  company_tagline text default 'Menuiserie Aluminium',
  company_address text default '',
  company_tel text default '',
  company_mobile text default '',
  company_email text default '',
  company_matricule text default '',
  company_rib text default '',
  company_agence text default '',
  logo_url text default '',
  stamp_url text default '',
  tax_fodec numeric(5,2) default 1.00,
  tax_tva numeric(5,2) default 19.00,
  tax_timbre numeric(10,3) default 1.000,
  invoice_prefix text default '2026',
  next_seq integer default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ WORKSPACE MEMBERS ============
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('owner','admin','user')),
  status text not null default 'active' check (status in ('pending','active','rejected')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_members_user on public.workspace_members(user_id);
create index if not exists idx_members_status on public.workspace_members(workspace_id, status);

-- ============ CLIENTS ============
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  cin text default '',
  tel text default '',
  adresse text default '',
  notes text default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_ws on public.clients(workspace_id);
create index if not exists idx_clients_name on public.clients(workspace_id, name);

-- ============ PRODUCTS ============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  designation text not null,
  price numeric(12,3) not null default 0,
  stock numeric(12,3),
  low_stock numeric(12,3),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_ws on public.products(workspace_id);

-- ============ INVOICES ============
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  number text not null,
  date date not null default current_date,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_cin text default '',
  client_tel text default '',
  client_adresse text default '',
  total_ht numeric(14,3) default 0,
  total_fodec numeric(14,3) default 0,
  total_net_ht numeric(14,3) default 0,
  total_tva numeric(14,3) default 0,
  total_timbre numeric(14,3) default 0,
  total_ttc numeric(14,3) default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('paid','partial','unpaid')),
  reglement text default '',
  notes text default '',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number)
);
create index if not exists idx_invoices_ws on public.invoices(workspace_id);
create index if not exists idx_invoices_ws_date on public.invoices(workspace_id, date desc);
create index if not exists idx_invoices_client on public.invoices(client_id);

-- ============ INVOICE ITEMS ============
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  position integer not null default 0,
  designation text not null default '',
  qte numeric(12,3) not null default 0,
  pu numeric(14,3) not null default 0,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_items_invoice on public.invoice_items(invoice_id);
create index if not exists idx_items_ws on public.invoice_items(workspace_id);

-- ============ AUDIT LOG ============
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  action text not null,
  entity_type text,
  entity_id uuid,
  entity_label text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_workspace_time on public.audit_log(workspace_id, created_at desc);

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

create or replace function public.is_active_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_ws_admin(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and status = 'active'
      and role in ('owner','admin')
  );
$$;

create or replace function public.my_role(ws_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = ws_id and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- WORKSPACES
alter table public.workspaces enable row level security;

drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members" on public.workspaces
  for select using (public.is_active_member(id) or created_by = auth.uid());

drop policy if exists "workspaces_insert_auth" on public.workspaces;
create policy "workspaces_insert_auth" on public.workspaces
  for insert with check (auth.uid() = created_by);

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin" on public.workspaces
  for update using (public.is_ws_admin(id));

-- WORKSPACE_MEMBERS
alter table public.workspace_members enable row level security;

drop policy if exists "members_select" on public.workspace_members;
create policy "members_select" on public.workspace_members
  for select using (
    user_id = auth.uid()
    or public.is_active_member(workspace_id)
  );

drop policy if exists "members_insert_self" on public.workspace_members;
create policy "members_insert_self" on public.workspace_members
  for insert with check (
    user_id = auth.uid()
    or public.is_ws_admin(workspace_id)
  );

drop policy if exists "members_update_admin" on public.workspace_members;
create policy "members_update_admin" on public.workspace_members
  for update using (public.is_ws_admin(workspace_id));

-- AUDIT LOG
alter table public.audit_log enable row level security;

drop policy if exists "audit_select_members" on public.audit_log;
create policy "audit_select_members" on public.audit_log
  for select using (public.is_active_member(workspace_id));

drop policy if exists "audit_insert_members" on public.audit_log;
create policy "audit_insert_members" on public.audit_log
  for insert with check (public.is_active_member(workspace_id) and user_id = auth.uid());

-- CLIENTS
alter table public.clients enable row level security;
drop policy if exists "clients_all_ws" on public.clients;
create policy "clients_all_ws" on public.clients
  for all using (public.is_active_member(workspace_id))
  with check (public.is_active_member(workspace_id));

-- PRODUCTS
alter table public.products enable row level security;
drop policy if exists "products_all_ws" on public.products;
create policy "products_all_ws" on public.products
  for all using (public.is_active_member(workspace_id))
  with check (public.is_active_member(workspace_id));

-- INVOICES
alter table public.invoices enable row level security;
drop policy if exists "invoices_all_ws" on public.invoices;
create policy "invoices_all_ws" on public.invoices
  for all using (public.is_active_member(workspace_id))
  with check (public.is_active_member(workspace_id));

-- INVOICE_ITEMS
alter table public.invoice_items enable row level security;
drop policy if exists "items_all_ws" on public.invoice_items;
create policy "items_all_ws" on public.invoice_items
  for all using (public.is_active_member(workspace_id))
  with check (public.is_active_member(workspace_id));

-- ================================================================
-- AUTO-CREATE PROFILE when user signs up
-- ================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    'user',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================
-- AUTO-UPDATE timestamps
-- ================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_workspaces_touch on public.workspaces;
create trigger trg_workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_clients_touch on public.clients;
create trigger trg_clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_invoices_touch on public.invoices;
create trigger trg_invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

-- ================================================================
-- STORAGE: workspace-scoped bucket
-- ================================================================

insert into storage.buckets (id, name, public)
  values ('user-files', 'user-files', false)
  on conflict (id) do nothing;

drop policy if exists "ws-files upload member" on storage.objects;
create policy "ws-files upload member" on storage.objects
  for insert with check (
    bucket_id = 'user-files'
    and public.is_active_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "ws-files read member" on storage.objects;
create policy "ws-files read member" on storage.objects
  for select using (
    bucket_id = 'user-files'
    and public.is_active_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "ws-files update admin" on storage.objects;
create policy "ws-files update admin" on storage.objects
  for update using (
    bucket_id = 'user-files'
    and public.is_ws_admin(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "ws-files delete admin" on storage.objects;
create policy "ws-files delete admin" on storage.objects
  for delete using (
    bucket_id = 'user-files'
    and public.is_ws_admin(((storage.foldername(name))[1])::uuid)
  );

-- ================================================================
-- DONE
-- ================================================================
