-- VAI JÁ — Schema inicial
-- Fonte de verdade do modelo de dados. Aplicar num projeto Supabase real com:
--   supabase db push
-- ou colar diretamente no SQL editor do Supabase.

create extension if not exists "pgcrypto";

-- ============ ENUMS ============

create type role_type as enum ('customer', 'driver', 'admin');
create type driver_approval_status as enum ('pending', 'approved', 'suspended');
create type driver_availability as enum ('offline', 'available', 'busy');
create type vehicle_category as enum ('van', 'small_truck', 'large_truck');
create type driver_application_status as enum ('pending', 'approved', 'rejected');
create type service_type as enum ('materials', 'debris', 'team_with_tools', 'moving', 'other');
create type timing_type as enum ('now', 'scheduled');
create type payment_method as enum ('card', 'mbway', 'cash');
create type payment_status as enum ('PENDING', 'DEMO_PAID', 'PAY_ON_DELIVERY');
create type order_status as enum (
  'PENDING', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING',
  'DRIVER_ARRIVED', 'CARGO_LOADING', 'CARGO_LOADED', 'IN_TRANSIT',
  'DELIVERED', 'CANCELLED'
);
create type change_request_status as enum ('pending_review', 'contacted', 'quoted', 'confirmed', 'cancelled');
create type notification_type as enum ('order_status', 'driver_assigned', 'driver_location', 'system');

-- ============ TABLES ============

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_type not null default 'customer',
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  status driver_approval_status not null default 'pending',
  service_area text,
  availability_status driver_availability not null default 'offline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  category vehicle_category not null,
  make text not null,
  model text not null,
  registration text not null,
  capacity_kg integer not null,
  created_at timestamptz not null default now()
);

create table driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  vehicle_category vehicle_category not null,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_registration text not null,
  vehicle_capacity_kg integer not null,
  service_area text not null,
  availability text not null,
  status driver_application_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  public_order_number text not null unique,
  customer_id uuid not null references profiles(id),
  driver_id uuid references driver_profiles(id),
  service_type service_type not null,
  timing_type timing_type not null,
  scheduled_at timestamptz,
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  destination_address text not null,
  destination_lat double precision,
  destination_lng double precision,
  distance_km numeric,
  cargo_description text,
  cargo_weight_kg numeric,
  package_count integer,
  vehicle_category vehicle_category not null,
  needs_helpers boolean not null default false,
  helpers_count integer not null default 0,
  helper_hours numeric not null default 0,
  passenger boolean not null default false,
  payment_method payment_method not null,
  payment_status payment_status not null default 'PENDING',
  base_price numeric not null default 0,
  distance_price numeric not null default 0,
  helper_price numeric not null default 0,
  tolls numeric not null default 0,
  total_price numeric not null default 0,
  status order_status not null default 'PENDING',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references driver_profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  recorded_at timestamptz not null default now()
);

create table change_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  pickup_address text not null,
  destination_address text not null,
  scheduled_at timestamptz,
  description text,
  helpers_count integer not null default 0,
  status change_request_status not null default 'pending_review',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table change_request_photos (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null references change_requests(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============

create index idx_orders_customer on orders(customer_id);
create index idx_orders_driver on orders(driver_id);
create index idx_orders_status on orders(status);
create index idx_driver_locations_driver on driver_locations(driver_id, recorded_at desc);
create index idx_notifications_user on notifications(user_id, read_at);

-- ============ HELPER FUNCTIONS ============

create or replace function current_role_type()
returns role_type
language sql stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql stable
as $$
  select coalesce(current_role_type() = 'admin', false);
$$;

create or replace function driver_profile_id_for_current_user()
returns uuid
language sql stable
as $$
  select id from driver_profiles where user_id = auth.uid();
$$;

-- ============ ROW LEVEL SECURITY ============

alter table profiles enable row level security;
alter table driver_profiles enable row level security;
alter table vehicles enable row level security;
alter table driver_applications enable row level security;
alter table orders enable row level security;
alter table order_photos enable row level security;
alter table order_status_history enable row level security;
alter table driver_locations enable row level security;
alter table change_requests enable row level security;
alter table change_request_photos enable row level security;
alter table notifications enable row level security;

-- PROFILES
create policy profiles_select_own_or_admin on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_own_or_admin on profiles
  for update using (id = auth.uid() or is_admin());
create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());

-- DRIVER PROFILES
create policy driver_profiles_select on driver_profiles
  for select using (user_id = auth.uid() or is_admin() or current_role_type() = 'driver');
create policy driver_profiles_update_own_or_admin on driver_profiles
  for update using (user_id = auth.uid() or is_admin());
create policy driver_profiles_insert_own on driver_profiles
  for insert with check (user_id = auth.uid() or is_admin());

-- VEHICLES
create policy vehicles_select_own_or_admin on vehicles
  for select using (
    driver_id = driver_profile_id_for_current_user() or is_admin()
  );
create policy vehicles_modify_own_or_admin on vehicles
  for all using (
    driver_id = driver_profile_id_for_current_user() or is_admin()
  );

-- DRIVER APPLICATIONS
create policy driver_applications_select on driver_applications
  for select using (user_id = auth.uid() or is_admin());
create policy driver_applications_insert on driver_applications
  for insert with check (true); -- página pública de candidatura
create policy driver_applications_update_admin on driver_applications
  for update using (is_admin());

-- ORDERS
create policy orders_select on orders
  for select using (
    customer_id = auth.uid()
    or driver_id = driver_profile_id_for_current_user()
    or is_admin()
    or (
      -- motoristas aprovados podem ver pedidos ainda não atribuídos
      driver_id is null
      and status = 'SEARCHING_DRIVER'
      and exists (select 1 from driver_profiles dp where dp.user_id = auth.uid() and dp.status = 'approved')
    )
  );
create policy orders_insert_own on orders
  for insert with check (customer_id = auth.uid());
create policy orders_update on orders
  for update using (
    customer_id = auth.uid()
    or driver_id = driver_profile_id_for_current_user()
    or is_admin()
  );

-- ORDER PHOTOS
create policy order_photos_select on order_photos
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_photos.order_id
        and (o.customer_id = auth.uid() or o.driver_id = driver_profile_id_for_current_user() or is_admin())
    )
  );
create policy order_photos_insert on order_photos
  for insert with check (
    exists (select 1 from orders o where o.id = order_photos.order_id and o.customer_id = auth.uid())
  );

-- ORDER STATUS HISTORY
create policy order_status_history_select on order_status_history
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (o.customer_id = auth.uid() or o.driver_id = driver_profile_id_for_current_user() or is_admin())
    )
  );
create policy order_status_history_insert on order_status_history
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_status_history.order_id
        and (o.driver_id = driver_profile_id_for_current_user() or is_admin())
    )
  );

-- DRIVER LOCATIONS
create policy driver_locations_select on driver_locations
  for select using (
    is_admin()
    or driver_id = driver_profile_id_for_current_user()
    or exists (
      select 1 from orders o
      where o.driver_id = driver_locations.driver_id
        and o.customer_id = auth.uid()
        and o.status not in ('DELIVERED', 'CANCELLED')
    )
  );
create policy driver_locations_insert_own on driver_locations
  for insert with check (driver_id = driver_profile_id_for_current_user());

-- CHANGE REQUESTS
create policy change_requests_select on change_requests
  for select using (customer_id = auth.uid() or is_admin());
create policy change_requests_insert_own on change_requests
  for insert with check (customer_id = auth.uid());
create policy change_requests_update on change_requests
  for update using (customer_id = auth.uid() or is_admin());

-- CHANGE REQUEST PHOTOS
create policy change_request_photos_select on change_request_photos
  for select using (
    exists (
      select 1 from change_requests cr
      where cr.id = change_request_photos.change_request_id
        and (cr.customer_id = auth.uid() or is_admin())
    )
  );
create policy change_request_photos_insert on change_request_photos
  for insert with check (
    exists (select 1 from change_requests cr where cr.id = change_request_photos.change_request_id and cr.customer_id = auth.uid())
  );

-- NOTIFICATIONS
create policy notifications_select_own on notifications
  for select using (user_id = auth.uid() or is_admin());
create policy notifications_update_own on notifications
  for update using (user_id = auth.uid());
create policy notifications_insert_admin on notifications
  for insert with check (is_admin() or true); -- sistema/admin cria notificações

-- ============ STORAGE BUCKETS ============
-- Executar uma vez (idempotente) para criar os buckets privados usados pelo Storage.
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('change-request-photos', 'change-request-photos', false)
on conflict (id) do nothing;
