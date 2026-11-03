-- Jalankan seluruh SQL ini di Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone text,
  created_at timestamptz default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Minecraft Premium',
  description text default '',
  price integer not null check(price >= 0),
  old_price integer default 0,
  stock integer not null default 0 check(stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz default now()
);
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check(discount_type in ('percent','fixed')),
  discount_value integer not null check(discount_value > 0),
  min_spend integer default 0,
  max_uses integer,
  used_count integer default 0,
  expires_at timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);
create table if not exists public.settings (
  key text primary key,
  value text not null
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  order_code text unique not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1,
  subtotal integer not null,
  discount integer not null default 0,
  requested_amount integer not null,
  payable_amount integer not null,
  customer_phone text not null,
  kipay_trx_id text unique,
  payment_status text not null default 'pending',
  order_status text not null default 'waiting_payment',
  payment_expires_at text,
  paid_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_kipay_trx_id_idx on public.orders(kipay_trx_id);

create or replace function public.is_zell_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select lower(coalesce(auth.jwt()->>'email','')) = 'jellyharman6@gmail.com' $$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.promos enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;

create policy "profiles read own or admin" on public.profiles for select using (auth.uid()=id or public.is_zell_admin());
create policy "profiles insert own" on public.profiles for insert with check (auth.uid()=id);
create policy "profiles update own" on public.profiles for update using (auth.uid()=id or public.is_zell_admin()) with check (auth.uid()=id or public.is_zell_admin());

create policy "products public active read" on public.products for select using (active=true or public.is_zell_admin());
create policy "products admin insert" on public.products for insert with check (public.is_zell_admin());
create policy "products admin update" on public.products for update using (public.is_zell_admin()) with check (public.is_zell_admin());
create policy "products admin delete" on public.products for delete using (public.is_zell_admin());

create policy "promos admin manage" on public.promos for all using (public.is_zell_admin()) with check (public.is_zell_admin());
create policy "settings public read" on public.settings for select using (true);
create policy "settings admin manage" on public.settings for all using (public.is_zell_admin()) with check (public.is_zell_admin());

create policy "orders own or admin read" on public.orders for select using (auth.uid()=user_id or public.is_zell_admin());
create policy "orders own insert" on public.orders for insert with check (auth.uid()=user_id);
create policy "orders admin update" on public.orders for update using (public.is_zell_admin()) with check (public.is_zell_admin());

-- Optional starter promo code
insert into public.promos(code,discount_type,discount_value,min_spend,active)
values ('ZELLNEW','percent',10,0,true)
on conflict (code) do nothing;

-- Supabase Auth > URL Configuration:
-- Site URL: https://YOUR-VERCEL-DOMAIN
-- Redirect URLs: https://YOUR-VERCEL-DOMAIN/** and http://localhost:3000/**
-- Auth > Email: enable email confirmations and configure SMTP for reliable delivery.


-- Storage: public image delivery, uploads restricted to the admin email.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880,
  allowed_mime_types=array['image/png','image/jpeg','image/webp'];

create policy "Public can view ZellMarket images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "Only Zell admin can upload images"
on storage.objects for insert
with check (bucket_id = 'product-images' and public.is_zell_admin());

create policy "Only Zell admin can update images"
on storage.objects for update
using (bucket_id = 'product-images' and public.is_zell_admin())
with check (bucket_id = 'product-images' and public.is_zell_admin());

create policy "Only Zell admin can delete images"
on storage.objects for delete
using (bucket_id = 'product-images' and public.is_zell_admin());
