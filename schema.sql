-- ============================================================
-- GESTOR DE PROJETOS - SUPABASE
-- Execute este arquivo no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'Backlog'
    check (status in ('Backlog', 'Planejado', 'Em andamento', 'Em risco', 'Concluído', 'Cancelado')),
  priority text not null default 'Média'
    check (priority in ('Baixa', 'Média', 'Alta', 'Urgente')),
  responsible text,
  progress integer not null default 0
    check (progress between 0 and 100),
  start_date date,
  due_date date,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_due_date_idx on public.projects (due_date);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_created_by_idx on public.projects (created_by);

-- Atualiza automaticamente updated_at em alterações.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

-- Segurança: o navegador acessa o banco com o token do usuário autenticado.
alter table public.projects enable row level security;

-- Remove políticas se o script for executado novamente.
drop policy if exists "Authenticated users can read projects" on public.projects;
drop policy if exists "Authenticated users can create projects" on public.projects;
drop policy if exists "Authenticated users can update projects" on public.projects;
drop policy if exists "Authenticated users can delete projects" on public.projects;

create policy "Authenticated users can read projects"
on public.projects
for select
to authenticated
using (true);

create policy "Authenticated users can create projects"
on public.projects
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Authenticated users can update projects"
on public.projects
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated users can delete projects"
on public.projects
for delete
to authenticated
using (true);

-- Permissões mínimas para a API de dados do cliente.
grant select, insert, update, delete on public.projects to authenticated;

-- Opcional: se o seu projeto Supabase exigir a exposição explícita da tabela na Data API,
-- adicione public.projects em Settings > API > Exposed schemas / Data API.
