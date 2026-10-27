-- جدول الدروس المضافة من لوحة الإدارة
-- شغّله في Supabase SQL Editor بعد schema.sql. غيّر ADMIN_EMAIL لإيميلك (4 مرات)

create table if not exists public.lessons (
  id text primary key check (char_length(id) <= 40),
  level int not null default 1 check (level between 1 and 9),
  title text not null check (char_length(title) between 1 and 120),
  mins int not null default 5 check (mins between 1 and 60),
  body text not null check (char_length(body) between 1 and 20000),
  try_it text check (char_length(try_it) <= 2000),
  quiz jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

-- الطلاب يقروا الدروس المنشورة بس
drop policy if exists "public read published lessons" on public.lessons;
create policy "public read published lessons" on public.lessons
  for select to anon, authenticated using (published = true);

-- المدير (إيميلك) يقرا الكل ويضيف ويعدل ويحذف
drop policy if exists "admin read lessons" on public.lessons;
create policy "admin read lessons" on public.lessons
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "admin insert lessons" on public.lessons;
create policy "admin insert lessons" on public.lessons
  for insert to authenticated with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "admin update lessons" on public.lessons;
create policy "admin update lessons" on public.lessons
  for update to authenticated using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL')
  with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "admin delete lessons" on public.lessons;
create policy "admin delete lessons" on public.lessons
  for delete to authenticated using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');
