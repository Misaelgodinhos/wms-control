-- Require explicit administrator approval for every new WMS account.
create or replace function public.wms_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, role, workspace_id, active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'operator', null, false)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.wms_handle_new_user() from public, anon, authenticated;

drop policy if exists profiles_admin_read_workspace_and_pending on public.profiles;
create policy profiles_admin_read_workspace_and_pending
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.id = (select auth.uid())
      and admin_profile.active = true
      and admin_profile.role::text = 'admin'
      and admin_profile.workspace_id is not null
      and (profiles.workspace_id = admin_profile.workspace_id or profiles.workspace_id is null)
  )
);

create or replace function public.wms_approve_user(target_user_id uuid, target_role text default 'operator')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_workspace_id uuid;
begin
  select p.workspace_id into admin_workspace_id
  from public.profiles p
  where p.id = (select auth.uid())
    and p.active = true
    and p.role::text = 'admin'
    and p.workspace_id is not null;

  if admin_workspace_id is null then
    raise exception 'Somente administradores ativos podem aprovar contas.';
  end if;

  if target_role not in ('admin', 'supervisor', 'operator', 'checker', 'viewer') then
    raise exception 'Perfil inválido.';
  end if;

  update public.profiles
  set workspace_id = admin_workspace_id,
      role = target_role::public.wms_role,
      active = true,
      updated_at = now()
  where id = target_user_id
    and id <> (select auth.uid())
    and (workspace_id is null or workspace_id = admin_workspace_id)
    and active = false;

  if not found then
    raise exception 'Conta pendente não encontrada ou já processada.';
  end if;
end;
$$;

revoke all on function public.wms_approve_user(uuid, text) from public, anon;
grant execute on function public.wms_approve_user(uuid, text) to authenticated;
