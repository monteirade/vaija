-- Schema SQLite para o modo demo (sem credenciais Supabase).
-- Espelha supabase/migrations/0001_init.sql com tipos adaptados a SQLite.
-- Isto NÃO substitui o schema Postgres — é apenas o backend local usado
-- quando não existem credenciais Supabase configuradas, para que o
-- protótipo continue totalmente funcional e com persistência real.

create table if not exists profiles (
  id text primary key,
  role text not null check (role in ('customer','driver','admin')),
  full_name text not null,
  email text not null unique,
  phone text,
  password_hash text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists driver_profiles (
  id text primary key,
  user_id text not null unique references profiles(id),
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  service_area text,
  availability_status text not null default 'offline' check (availability_status in ('offline','available','busy')),
  created_at text not null,
  updated_at text not null
);

create table if not exists vehicles (
  id text primary key,
  driver_id text not null references driver_profiles(id),
  category text not null check (category in ('van','small_truck','large_truck')),
  make text not null,
  model text not null,
  registration text not null,
  capacity_kg integer not null,
  created_at text not null
);

create table if not exists driver_applications (
  id text primary key,
  user_id text references profiles(id),
  full_name text not null,
  email text not null,
  phone text not null,
  vehicle_category text not null,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_registration text not null,
  vehicle_capacity_kg integer not null,
  service_area text not null,
  availability text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  notes text,
  created_at text not null
);

create table if not exists orders (
  id text primary key,
  public_order_number text not null unique,
  customer_id text not null references profiles(id),
  driver_id text references driver_profiles(id),
  service_type text not null,
  timing_type text not null,
  scheduled_at text,
  pickup_address text not null,
  pickup_lat real,
  pickup_lng real,
  destination_address text not null,
  destination_lat real,
  destination_lng real,
  distance_km real,
  cargo_description text,
  cargo_weight_kg real,
  package_count integer,
  vehicle_category text not null,
  needs_helpers integer not null default 0,
  helpers_count integer not null default 0,
  helper_hours real not null default 0,
  passenger integer not null default 0,
  payment_method text not null,
  payment_status text not null default 'PENDING',
  base_price real not null default 0,
  distance_price real not null default 0,
  helper_price real not null default 0,
  tolls real not null default 0,
  total_price real not null default 0,
  status text not null default 'PENDING',
  notes text,
  created_at text not null,
  updated_at text not null
);

create table if not exists order_photos (
  id text primary key,
  order_id text not null references orders(id),
  storage_path text not null,
  created_at text not null
);

create table if not exists order_status_history (
  id text primary key,
  order_id text not null references orders(id),
  status text not null,
  changed_by text,
  created_at text not null
);

create table if not exists driver_locations (
  id text primary key,
  driver_id text not null references driver_profiles(id),
  lat real not null,
  lng real not null,
  accuracy real,
  recorded_at text not null
);

create table if not exists change_requests (
  id text primary key,
  customer_id text not null references profiles(id),
  pickup_address text not null,
  destination_address text not null,
  scheduled_at text,
  description text,
  helpers_count integer not null default 0,
  status text not null default 'pending_review',
  notes text,
  created_at text not null,
  updated_at text not null
);

create table if not exists change_request_photos (
  id text primary key,
  change_request_id text not null references change_requests(id),
  storage_path text not null,
  created_at text not null
);

create table if not exists notifications (
  id text primary key,
  user_id text not null references profiles(id),
  type text not null,
  title text not null,
  body text,
  read_at text,
  created_at text not null
);
