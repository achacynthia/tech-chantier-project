create table if not exists app_users (
  id bigserial primary key,
  first_name text,
  last_name text,
  name text not null,
  email text not null unique,
  country text,
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists materials (
  id bigserial primary key,
  name text not null unique,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  unit text not null default 'unit',
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  cost_currency text not null default 'USD',
  low_stock_threshold numeric(12,2) not null default 10 check (low_stock_threshold >= 0),
  purchase_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id bigserial primary key,
  product_name text not null unique,
  unit_currency text not null default 'USD',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists product_ingredients (
  id bigserial primary key,
  product_id bigint not null references products(id) on delete cascade,
  material_name text not null,
  amount_per_unit numeric(12,2) not null check (amount_per_unit > 0),
  unique (product_id, material_name)
);

create table if not exists finished_goods (
  product_id bigint primary key references products(id) on delete cascade,
  product_name text not null,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists production_logs (
  id bigserial primary key,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  material_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id bigserial primary key,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  quantity_sold numeric(12,2) not null check (quantity_sold > 0),
  unit_currency text not null default 'USD',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  quantity_left numeric(12,2) not null default 0 check (quantity_left >= 0),
  sale_date date not null default current_date,
  created_at timestamptz not null default now()
);
