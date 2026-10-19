# WMS Control — Supabase-ready starter

Responsive WMS interface (blue / white / black) built with React + TypeScript + Vite and Supabase Auth/Postgres.

## Supabase project already provisioned
- Project: `wms-control`
- Region: `sa-east-1` (São Paulo)
- URL: `https://ftlspegsluzibjulbnst.supabase.co`
- Workspace seeded: `Armazém Principal`
- Database schema and RLS applied directly to the project.

The publishable key is public by design, but this repository uses an environment variable. Never place a Supabase secret/service-role key in frontend code.

## Run locally
1. Install Node.js 20.19+ or 22.12+.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL=https://ftlspegsluzibjulbnst.supabase.co`.
4. Copy the **publishable key** from Supabase Dashboard → Project Settings → API Keys into `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Run `npm install`, then `npm run dev`.

## First administrator setup
1. Start the app and create an account from the login screen.
2. Open Supabase Dashboard → SQL Editor.
3. Open `supabase/bootstrap/first_admin.sql`; replace `admin@example.com` with the account email, then run it.
4. Sign out and back in. The profile should now have the `admin` role and be linked to `Armazém Principal`.
5. Configure Supabase Auth email confirmation and production redirect URLs before real deployment.

New accounts are deliberately created with no workspace. This prevents an open signup from automatically joining the company's warehouse. The first admin must be assigned explicitly.

## Database modules
`workspaces`, `profiles`, `warehouses`, `products`, `locations`, `stock_balances`, `stock_movements`, `receipts`, `receipt_items`, `picking_tasks`, `picking_items`, `replenishments`, `shipments`, `cycle_counts`, `audit_logs`.

RLS is enabled on all public tables. Data policies scope operational rows to the user's active workspace. Profiles cannot self-assign their role/workspace; signed-in users can update only their own `full_name`.

## Important current limitations
- CRUD for the product, warehouse, location, receipt, picking, replenishment, shipment and cycle-count header tables is wired to Supabase.
- The other operational tables currently have list/read views but not complete transaction workflows.
- Status cycling is a starter UI, not an inventory transaction engine. **Do not use it as the authoritative stock process in production.** Build atomic database RPC functions or server-side transactions to post receipt, reserve/pick, transfer, replenish and dispatch; write immutable movement records and update balances together.
- Role checks are enforced by RLS for database rows, but this starter UI should be expanded with explicit per-action UX checks and audited admin user management before production.
- A live production test requires creating an Auth user and assigning it to the workspace with the bootstrap SQL. The database schema and RLS flags were verified in the connected project; anonymous/authenticated CRUD and end-to-end login were not tested with a real user session.

## GitHub publication
This project is tracked in the `Misaelgodinhos/wms-control` repository. Do not commit `.env.local`.
