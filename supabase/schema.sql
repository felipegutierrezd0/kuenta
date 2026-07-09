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
  is_fixed boolean not null default false,
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

  insert into categories (workspace_id, name, type, icon, color, is_fixed) values
    -- Colores distintos por posición dentro de cada tipo (ángulo dorado, ver lib/categoryColor.ts)
    -- para que el gráfico de Reportes nunca muestre dos categorías con el mismo color.
    -- Renta y Servicios arrancan marcadas como gasto fijo (caso típico); el usuario puede
    -- cambiarlo para cualquier categoría desde Ajustes → Categorías.
    (v_workspace_id, 'Salario', 'ingreso', 'cash', '#d22d2d', false),
    (v_workspace_id, 'Ventas', 'ingreso', 'trending-up', '#2dd25d', false),
    (v_workspace_id, 'Otros ingresos', 'ingreso', 'plus-circle', '#8d2dd2', false),
    (v_workspace_id, 'Comida', 'gasto', 'food', '#d22d2d', false),
    (v_workspace_id, 'Transporte', 'gasto', 'car', '#2dd25d', false),
    (v_workspace_id, 'Servicios', 'gasto', 'flash', '#8d2dd2', true),
    (v_workspace_id, 'Renta', 'gasto', 'home', '#d2be2d', true),
    (v_workspace_id, 'Otros gastos', 'gasto', 'dots-horizontal', '#2db7d2', false),
    (v_workspace_id, 'Ahorro general', 'ahorro', 'piggy-bank', '#d22d2d', false);

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

create policy "update own workspaces" on workspaces
  for update using (
    id in (select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin'))
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

-- ============================================================================
-- Ampliación: cuentas, presupuestos, metas, recurrentes, cobros/pagos, invitaciones.
-- ============================================================================

-- Cuentas (banco, efectivo, tarjeta) para poder ver saldos reales por cuenta.
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('efectivo', 'banco', 'tarjeta', 'otro')),
  initial_balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table transactions add column if not exists account_id uuid references accounts(id) on delete set null;

-- Clasificación directa de gasto fijo/variable, definida por el usuario en Ajustes → Categorías
-- (reemplaza la inferencia anterior basada en si la categoría tenía un recurrente activo).
alter table categories add column if not exists is_fixed boolean not null default false;

create index if not exists accounts_workspace_idx on accounts (workspace_id);
create index if not exists transactions_account_idx on transactions (account_id);

-- Presupuestos mensuales por categoría de gasto.
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, category_id)
);

create index if not exists budgets_workspace_idx on budgets (workspace_id);

-- Metas de ahorro con objetivo y fecha.
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  target_date date,
  saved_amount numeric(12, 2) not null default 0 check (saved_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists savings_goals_workspace_idx on savings_goals (workspace_id);

-- Plantillas de movimientos recurrentes (suscripciones, renta, nómina, etc.).
create table if not exists recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('ingreso', 'gasto', 'ahorro')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  frequency text not null check (frequency in ('semanal', 'quincenal', 'mensual')),
  next_due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists recurring_workspace_idx on recurring_transactions (workspace_id);

-- Cuentas por cobrar/pagar (pensado para workspaces tipo "negocio").
create table if not exists receivables (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  direction text not null check (direction in ('cobrar', 'pagar')),
  counterparty text not null,
  amount numeric(12, 2) not null check (amount > 0),
  due_date date,
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  created_at timestamptz not null default now()
);

create index if not exists receivables_workspace_idx on receivables (workspace_id);

-- Invitaciones a workspace por correo (para invitar miembros a un negocio).
create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')) default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists workspace_invites_email_idx on workspace_invites (email);

-- RLS: mismo patrón que el resto de tablas (acceso restringido a los miembros del workspace).
alter table accounts enable row level security;
alter table budgets enable row level security;
alter table savings_goals enable row level security;
alter table recurring_transactions enable row level security;
alter table receivables enable row level security;
alter table workspace_invites enable row level security;

create policy "select accounts in own workspaces" on accounts
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "insert accounts in own workspaces" on accounts
  for insert with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "update accounts in own workspaces" on accounts
  for update using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "delete accounts in own workspaces" on accounts
  for delete using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "select budgets in own workspaces" on budgets
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "insert budgets in own workspaces" on budgets
  for insert with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "update budgets in own workspaces" on budgets
  for update using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "delete budgets in own workspaces" on budgets
  for delete using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "select goals in own workspaces" on savings_goals
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "insert goals in own workspaces" on savings_goals
  for insert with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "update goals in own workspaces" on savings_goals
  for update using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "delete goals in own workspaces" on savings_goals
  for delete using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "select recurring in own workspaces" on recurring_transactions
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "insert recurring in own workspaces" on recurring_transactions
  for insert with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "update recurring in own workspaces" on recurring_transactions
  for update using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "delete recurring in own workspaces" on recurring_transactions
  for delete using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "select receivables in own workspaces" on receivables
  for select using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "insert receivables in own workspaces" on receivables
  for insert with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "update receivables in own workspaces" on receivables
  for update using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));
create policy "delete receivables in own workspaces" on receivables
  for delete using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- Invitaciones: los owner/admin del workspace pueden crear/borrar; el invitado puede ver
-- (y luego aceptar vía RPC) las invitaciones dirigidas a su propio correo.
create policy "select own invites" on workspace_invites
  for select using (
    email = (auth.jwt() ->> 'email')
    or workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "insert invites as owner or admin" on workspace_invites
  for insert with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
create policy "delete invites as owner or admin" on workspace_invites
  for delete using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Acepta una invitación pendiente dirigida al correo del usuario autenticado: lo agrega como
-- miembro del workspace con el rol invitado y borra la invitación. security definer porque el
-- usuario invitado todavía no es miembro del workspace (no pasaría la policy de insert normal).
create or replace function public.accept_workspace_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite workspace_invites%rowtype;
begin
  select * into v_invite from workspace_invites where id = p_invite_id;

  if v_invite.id is null then
    raise exception 'Invitación no encontrada';
  end if;

  if v_invite.email <> (auth.jwt() ->> 'email') then
    raise exception 'Esta invitación no corresponde a tu correo';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
    values (v_invite.workspace_id, auth.uid(), v_invite.role)
    on conflict (workspace_id, user_id) do nothing;

  delete from workspace_invites where id = p_invite_id;
end;
$$;

grant execute on function public.accept_workspace_invite(uuid) to authenticated;
