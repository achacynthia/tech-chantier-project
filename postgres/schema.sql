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
  user_key text not null,
  name text not null,
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
  user_key text not null,
  product_name text not null,
  unit_currency text not null default 'USD',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists product_ingredients (
  id bigserial primary key,
  user_key text not null,
  product_id bigint not null references products(id) on delete cascade,
  material_name text not null,
  amount_per_unit numeric(12,2) not null check (amount_per_unit > 0)
  -- uniqueness should be scoped to the user and case-insensitive on material name
  -- (product_id alone is globally unique but scoping by user_key prevents cross-user conflicts)
  -- we'll create a case-insensitive unique index below instead of a raw constraint here
);

create table if not exists finished_goods (
  user_key text not null,
  product_id bigint primary key references products(id) on delete cascade,
  product_name text not null,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists production_logs (
  id bigserial primary key,
  user_key text not null,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  material_summary jsonb not null default CAST('[]' AS jsonb),
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id bigserial primary key,
  user_key text not null,
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

-- Migration helper block commented out to avoid parser/runtime conflicts in linting.
-- These alter/update statements were intended for adding and populating
-- a `user_key` column on existing tables in a PostgreSQL database.
--
-- alter table materials add column user_key text;
-- update materials set user_key = 'default-user' where user_key is null or trim(user_key) = '';
-- alter table materials alter column user_key set not null;
--
-- alter table products add column user_key text;
-- update products set user_key = 'default-user' where user_key is null or trim(user_key) = '';
-- alter table products alter column user_key set not null;
--
-- alter table product_ingredients add column user_key text;
-- update product_ingredients set user_key = 'default-user' where user_key is null or trim(user_key) = '';
-- alter table product_ingredients alter column user_key set not null;
--
-- alter table finished_goods add column user_key text;
-- update finished_goods set user_key = 'default-user' where user_key is null or trim(user_key) = '';
-- alter table finished_goods alter column user_key set not null;
--
-- alter table production_logs add column user_key text;
-- update production_logs set user_key = 'default-user' where user_key is null or trim(user_key) = '';
-- alter table production_logs alter column user_key set not null;
--
-- alter table sales add column user_key text;
-- update sales set user_key = 'default-user' where user_key is null or trim(user_key) = '';
-- alter table sales alter column user_key set not null;

alter table materials drop constraint materials_name_key;
alter table products drop constraint products_product_name_key;

create unique index if not exists uq_materials_user_name on materials(user_key, lower(name));
create unique index if not exists uq_product_ingredients_user_product_material on product_ingredients(user_key, product_id, lower(material_name));
create unique index if not exists uq_products_user_name on products(user_key, lower(product_name));
create index if not exists idx_materials_user_key on materials(user_key);
create index if not exists idx_products_user_key on products(user_key);
create index if not exists idx_product_ingredients_user_key on product_ingredients(user_key);
create index if not exists idx_finished_goods_user_key on finished_goods(user_key);
create index if not exists idx_production_logs_user_key on production_logs(user_key);
create index if not exists idx_sales_user_key on sales(user_key);
