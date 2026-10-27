-- شغّل الملف ده كله في Supabase: SQL Editor -> New query -> Run
-- مهم: غيّر الإيميل ده لإيميلك أنت (المدير) قبل التشغيل
-- ADMIN_EMAIL = ضع إيميل المدير بدل السطر اللي تحت

create table if not exists public.students (
  id uuid primary key,
  nickname text not null check (char_length(nickname) between 1 and 30),
  age int check (age between 10 and 25),
  goal text check (goal in ('study','project','protect','curious')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check (char_length(kind) <= 30),
  item text check (char_length(item) <= 60),
  score int,
  total int,
  created_at timestamptz not null default now()
);

create index if not exists events_student_idx on public.events(student_id, created_at desc);

alter table public.students enable row level security;
alter table public.events   enable row level security;

-- الزائر (الطالب) يقدر يضيف بس، مايقدرش يقرا ولا يعدل ولا يحذف
drop policy if exists "anon insert students" on public.students;
create policy "anon insert students" on public.students
  for insert to anon, authenticated with check (true);

drop policy if exists "anon insert events" on public.events;
create policy "anon insert events" on public.events
  for insert to anon, authenticated with check (true);

-- المدير بس (إيميلك) يقرا ويحذف
drop policy if exists "admin read students" on public.students;
create policy "admin read students" on public.students
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "admin read events" on public.events;
create policy "admin read events" on public.events
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "admin delete students" on public.students;
create policy "admin delete students" on public.students
  for delete to authenticated using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');
