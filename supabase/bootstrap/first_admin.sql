-- Execute in Supabase SQL Editor AFTER creating your first account in the WMS login.
-- Replace admin@example.com with the exact e-mail used for signup.
begin;
update public.profiles p set workspace_id = w.id, role = 'admin', active = true from auth.users u cross join public.workspaces w where p.id = u.id and lower(u.email) = lower('admin@example.com') and w.name = 'Armazém Principal';
insert into public.warehouses(workspace_id, code, name, address) select id, 'CD-01', 'Centro de Distribuição Principal', 'São Paulo - SP' from public.workspaces where name = 'Armazém Principal' on conflict (workspace_id, code) do nothing;
commit;
select p.id, u.email, p.role, p.workspace_id, p.active from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = lower('admin@example.com');
