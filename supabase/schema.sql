create table if not exists public.aws_docs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.aws_docs enable row level security;

drop policy if exists "aws_docs_select_own" on public.aws_docs;
drop policy if exists "aws_docs_insert_own" on public.aws_docs;
drop policy if exists "aws_docs_update_own" on public.aws_docs;
drop policy if exists "aws_docs_delete_own" on public.aws_docs;

create policy "aws_docs_select_own" on public.aws_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "aws_docs_insert_own" on public.aws_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "aws_docs_update_own" on public.aws_docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "aws_docs_delete_own" on public.aws_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'aws_docs'
  ) then
    alter publication supabase_realtime add table public.aws_docs;
  end if;
end $$;
