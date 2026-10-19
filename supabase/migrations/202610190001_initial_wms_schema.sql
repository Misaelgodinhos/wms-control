create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'operator' check (role in ('admin','supervisor','operator','checker','viewer')),
  workspace_id uuid references public.workspaces(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null, name text not null, address text,
  created_at timestamptz not null default now(), unique(workspace_id,code)
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  sku text not null, name text not null, category text, barcode text, unit text not null default 'UN',
  min_stock numeric(14,3) not null default 0 check(min_stock>=0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,sku)
);
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  code text not null, zone text, location_type text not null default 'storage' check(location_type in ('storage','picking','staging','dock','blocked')),
  created_at timestamptz not null default now(), unique(warehouse_id,code)
);
create table if not exists public.stock_balances (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  quantity numeric(14,3) not null default 0 check(quantity>=0), reserved_quantity numeric(14,3) not null default 0 check(reserved_quantity>=0),
  updated_at timestamptz not null default now()
);
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid references public.warehouses(id) on delete restrict, product_id uuid references public.products(id) on delete restrict,
  from_location_id uuid references public.locations(id) on delete restrict, to_location_id uuid references public.locations(id) on delete restrict,
  movement_type text not null, quantity numeric(14,3) not null check(quantity>0), reference_code text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, receipt_code text not null,
  supplier_name text not null, purchase_order text, status text not null default 'pending' check(status in ('pending','checking','received','cancelled')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now(), unique(workspace_id,receipt_code)
);
create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade, product_id uuid not null references public.products(id) on delete restrict,
  expected_quantity numeric(14,3) not null default 0 check(expected_quantity>=0), received_quantity numeric(14,3) not null default 0 check(received_quantity>=0),
  lot_code text, created_at timestamptz not null default now()
);
create table if not exists public.picking_tasks (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, task_code text not null, order_code text not null,
  customer_name text, assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','in_progress','completed','cancelled')),
  started_at timestamptz, completed_at timestamptz, created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), unique(workspace_id,task_code)
);
create table if not exists public.picking_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.picking_tasks(id) on delete cascade, product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict, requested_quantity numeric(14,3) not null check(requested_quantity>0),
  picked_quantity numeric(14,3) not null default 0 check(picked_quantity>=0), created_at timestamptz not null default now()
);
create table if not exists public.replenishments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, replenishment_code text not null,
  product_id uuid not null references public.products(id) on delete restrict, from_location_id uuid not null references public.locations(id) on delete restrict,
  to_location_id uuid not null references public.locations(id) on delete restrict, quantity numeric(14,3) not null check(quantity>0),
  status text not null default 'pending' check(status in ('pending','in_progress','completed','cancelled')),
  assigned_to uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), unique(workspace_id,replenishment_code)
);
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, shipment_code text not null, order_code text not null,
  carrier text, dock_code text, package_count integer not null default 0 check(package_count>=0),
  status text not null default 'ready' check(status in ('ready','dispatched','cancelled')), dispatched_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(), created_at timestamptz not null default now(),
  unique(workspace_id,shipment_code)
);
create table if not exists public.cycle_counts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict, count_code text not null, area_code text not null,
  count_type text not null default 'cycle', assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'in_progress' check(status in ('planned','in_progress','completed','cancelled')),
  item_count integer not null default 0 check(item_count>=0), discrepancy_count integer not null default 0 check(discrepancy_count>=0),
  closed_at timestamptz, created_at timestamptz not null default now(), unique(workspace_id,count_code)
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null default auth.uid(), action text not null, entity_type text not null,
  entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

insert into public.workspaces(name) values ('Armazém Principal') on conflict(name) do nothing;

create or replace function public.wms_handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,role,workspace_id,active)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),'operator',null,true)
  on conflict(id) do nothing;
  return new;
end;
$$;
revoke all on function public.wms_handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_wms on auth.users;
create trigger on_auth_user_created_wms after insert on auth.users for each row execute function public.wms_handle_new_user();

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.warehouses enable row level security;
alter table public.products enable row level security;
alter table public.locations enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.picking_tasks enable row level security;
alter table public.picking_items enable row level security;
alter table public.replenishments enable row level security;
alter table public.shipments enable row level security;
alter table public.cycle_counts enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists profiles_update_self_name on public.profiles;
create policy profiles_update_self_name on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists workspace_read_member on public.workspaces;
create policy workspace_read_member on public.workspaces for select to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.workspace_id=workspaces.id and p.active=true));

do $$ declare t text; begin
 foreach t in array array['warehouses','products','locations','stock_balances','stock_movements','receipts','receipt_items','picking_tasks','picking_items','replenishments','shipments','cycle_counts','audit_logs'] loop
  execute format('drop policy if exists wms_workspace_select on public.%I',t);
  execute format('create policy wms_workspace_select on public.%I for select to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.workspace_id=%I.workspace_id and p.active=true))',t,t);
  execute format('drop policy if exists wms_workspace_insert on public.%I',t);
  execute format('create policy wms_workspace_insert on public.%I for insert to authenticated with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.workspace_id=%I.workspace_id and p.active=true and p.role in (''admin'',''supervisor'',''operator'',''checker'')))',t,t);
  execute format('drop policy if exists wms_workspace_update on public.%I',t);
  execute format('create policy wms_workspace_update on public.%I for update to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.workspace_id=%I.workspace_id and p.active=true and p.role in (''admin'',''supervisor'',''operator'',''checker''))) with check(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.workspace_id=%I.workspace_id and p.active=true and p.role in (''admin'',''supervisor'',''operator'',''checker'')))',t,t,t);
  execute format('drop policy if exists wms_workspace_delete_admin on public.%I',t);
  execute format('create policy wms_workspace_delete_admin on public.%I for delete to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.workspace_id=%I.workspace_id and p.active=true and p.role in (''admin'',''supervisor'')))',t,t);
 end loop;
end $$;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.workspaces,public.profiles,public.warehouses,public.products,public.locations,public.stock_balances,public.stock_movements,public.receipts,public.receipt_items,public.picking_tasks,public.picking_items,public.replenishments,public.shipments,public.cycle_counts,public.audit_logs to authenticated;
revoke all on public.workspaces,public.profiles,public.warehouses,public.products,public.locations,public.stock_balances,public.stock_movements,public.receipts,public.receipt_items,public.picking_tasks,public.picking_items,public.replenishments,public.shipments,public.cycle_counts,public.audit_logs from anon;
revoke update on public.profiles from authenticated;
grant update(full_name) on public.profiles to authenticated;
