-- Esquema para la app de gastos, ahorros e ingresos.
-- Pega este archivo completo en el SQL Editor de tu proyecto de Supabase (https://supabase.com) y ejecútalo.

create extension if not exists "pgcrypto";

-- Un workspace representa un "espacio" de datos: puede ser el personal del usuario
-- o el de un negocio (pyme). Un usuario puede pertenecer a varios workspaces.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal', 'negocio')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Relación usuario <-> workspace. Preparada para invitar miembros a un negocio (v2).
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')) default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('ingreso', 'gasto', 'ahorro')),
  icon text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('ingreso', 'gasto', 'ahorro')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  balance numeric(12, 2) not null check (balance >= 0),
  interest_rate numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists transactions_workspace_month_idx on transactions (workspace_id, occurred_on);
create index if not exists categories_workspace_idx on categories (workspace_id);
create index if not exists workspace_members_user_idx on workspace_members (user_id);
create index if not exists debts_workspace_idx on debts (workspace_id);

-- Crea un workspace + membresía de owner + categorías por defecto en una sola transacción.
create or replace function public._create_workspace(p_user_id uuid, p_name text, p_type text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  insert into workspaces (name, type, owner_id) values (p_name, p_type, p_user_id)
    returning id into v_workspace_id;

  insert into workspace_members (workspace_id, user_id, role) values (v_workspace_id, p_user_id, 'owner');

  insert into categories (workspace_id, name, type, icon, color) values
    (v_workspace_id, 'Salario', 'ingreso', 'cash', '#16a34a'),
    (v_workspace_id, 'Ventas', 'ingreso', 'trending-up', '#16a34a'),
    (v_workspace_id, 'Otros ingresos', 'ingreso', 'plus-circle', '#16a34a'),
    (v_workspace_id, 'Comida', 'gasto', 'food', '#dc2626'),
    (v_workspace_id, 'Transporte', 'gasto', 'car', '#dc2626'),
    (v_workspace_id, 'Servicios', 'gasto', 'flash', '#dc2626'),
    (v_workspace_id, 'Renta', 'gasto', 'home', '#dc2626'),
    (v_workspace_id, 'Otros gastos', 'gasto', 'dots-horizontal', '#dc2626'),
    (v_workspace_id, 'Ahorro general', 'ahorro', 'piggy-bank', '#2563eb');

  return v_workspace_id;
end;
$$;

-- RPC pública para que el usuario cree workspaces adicionales (ej. uno de "Negocio").
create or replace function public.create_workspace(p_name text, p_type text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public._create_workspace(auth.uid(), p_name, p_type);
$$;

grant execute on function public.create_workspace(text, text) to authenticated;

-- Al crear una cuenta, se crea automáticamente su workspace "Personal".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._create_workspace(new.id, 'Personal', 'personal');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: cada usuario solo ve/edita datos de los workspaces a los que pertenece.
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table debts enable row level security;

create policy "select own workspaces" on workspaces
  for select using (
    id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "select own memberships" on workspace_members
  for select using (user_id = auth.uid());

create policy "select categories in own workspaces" on categories
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "insert categories in own workspaces" on categories
  for insert with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "update categories in own workspaces" on categories
  for update using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "delete categories in own workspaces" on categories
  for delete using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "select transactions in own workspaces" on transactions
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "insert transactions in own workspaces" on transactions
  for insert with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    and user_id = auth.uid()
  );
create policy "update transactions in own workspaces" on transactions
  for update using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "delete transactions in own workspaces" on transactions
  for delete using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "select debts in own workspaces" on debts
  for select using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "insert debts in own workspaces" on debts
  for insert with check (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "update debts in own workspaces" on debts
  for update using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
create policy "delete debts in own workspaces" on debts
  for delete using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );
