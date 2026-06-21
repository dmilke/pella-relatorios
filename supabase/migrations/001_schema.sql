-- ============================================================
-- Pella Bethânia — SaaS Relatórios
-- Schema v1.1
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type perfil_usuario as enum ('admin', 'apoio', 'analista', 'profissional');

create type categoria_encaminhamento as enum (
  'Pronto Socorro',
  'Outras Especialidades Particular',
  'Outras Especialidades SUS',
  'Atendimentos dentista/SUS',
  'Atendimentos dentista/Part'
);

-- ============================================================
-- TABELAS
-- ============================================================

-- 1. Usuários
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  area_profissao text not null,
  conselho text,
  email text unique,
  perfil perfil_usuario not null default 'profissional',
  tem_login boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- 2. Atividades (Catálogo)
create table atividades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 3. Subatividades
create table subatividades (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references atividades(id) on delete cascade,
  nome text not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(atividade_id, nome)
);

-- 4. Unidades
create table unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- 5. Autorizações de Atividade por Profissional
create table autorizacoes_atividade (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  atividade_id uuid not null references atividades(id) on delete cascade,
  local_obrigatorio boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(usuario_id, atividade_id)
);

-- 6. Registros de Atividade
create table registros_atividade (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references usuarios(id),
  operador_id uuid not null references usuarios(id),
  atividade_id uuid not null references atividades(id),
  subatividade_id uuid references subatividades(id),
  unidade_id uuid references unidades(id),
  data_referencia date not null,
  lancado_em timestamptz not null default now(),
  qtd_idosos smallint not null default 0 check (qtd_idosos >= 0),
  qtd_pcd smallint not null default 0 check (qtd_pcd >= 0),
  qtd_colaboradores smallint not null default 0 check (qtd_colaboradores >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint atendimento_nao_vazio check (
    (qtd_idosos + qtd_pcd + qtd_colaboradores) > 0
  )
);

-- 7. Registros de Encaminhamento Externo
create table registros_encaminhamento (
  id uuid primary key default gen_random_uuid(),
  operador_id uuid not null references usuarios(id),
  categoria categoria_encaminhamento not null,
  data_referencia date not null,
  lancado_em timestamptz not null default now(),
  qtd_idosos smallint not null default 0 check (qtd_idosos >= 0),
  qtd_pcd smallint not null default 0 check (qtd_pcd >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint atendimento_nao_vazio check (
    (qtd_idosos + qtd_pcd) > 0
  )
);

-- 8. Descritivos Mensais (Aba 2)
create table descritivos_mensais (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references usuarios(id),
  atividade_id uuid not null references atividades(id),
  mes integer not null check (mes between 1 and 12),
  ano integer not null,
  atividade_desenvolvida text,
  frequencia text,
  objetivos text,
  relato text,
  acontecimento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(profissional_id, atividade_id, mes, ano)
);

-- 9. Períodos (Consolidates bloqueios and liberacoes)
create table periodos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  ano smallint not null,
  mes smallint not null check (mes >= 1 and mes <= 12),
  status text not null default 'aberto',
  prazo_limite date not null,
  liberado_por uuid references usuarios(id),
  liberado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique(usuario_id, mes, ano)
);

-- 10. Notificações
create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references usuarios(id) on delete cascade,
  mensagem text not null,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

-- 11. Auditoria
create table auditoria (
  id uuid primary key default gen_random_uuid(),
  operador_id uuid not null references usuarios(id),
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  dados_antes jsonb,
  dados_depois jsonb,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_registros_atividade_profissional on registros_atividade(profissional_id);
create index idx_registros_atividade_data on registros_atividade(data_referencia);
create index idx_registros_atividade_atividade on registros_atividade(atividade_id);
create index idx_registros_encaminhamento_operador on registros_encaminhamento(operador_id);
create index idx_registros_encaminhamento_data on registros_encaminhamento(data_referencia);
create index idx_descr_mensal_profissional on descritivos_mensais(profissional_id);
create index idx_notificacoes_usuario on notificacoes(destinatario_id, lida);
create index idx_auditoria_tabela on auditoria(tabela, registro_id);
create index idx_auditoria_created on auditoria(criado_em desc);
create index idx_periodos_usuario on periodos(usuario_id, mes, ano);
create index idx_autorizacoes_usuario on autorizacoes_atividade(usuario_id);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table usuarios enable row level security;
alter table atividades enable row level security;
alter table subatividades enable row level security;
alter table unidades enable row level security;
alter table autorizacoes_atividade enable row level security;
alter table registros_atividade enable row level security;
alter table registros_encaminhamento enable row level security;
alter table descritivos_mensais enable row level security;
alter table periodos enable row level security;
alter table notificacoes enable row level security;
alter table auditoria enable row level security;

-- Helper: perfil do usuário logado
-- SECURITY DEFINER evita recursão com RLS em usuarios
create or replace function public.auth_perfil()
returns perfil_acesso
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil perfil_acesso;
begin
  select u.perfil
    into v_perfil
  from public.usuarios u
  where u.id = auth.uid();

  return coalesce(v_perfil, 'profissional'::perfil_acesso);
end;
$$;

-- Helper: usuario_id a partir do auth.uid()
create or replace function public.auth_usuario_id()
returns uuid
language sql stable
as $$
  select auth.uid();
$$;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- usuarios
create policy "Admin pode gerenciar usuarios"
  on usuarios for all
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

create policy "Usuarios veem seus proprios dados"
  on usuarios for select
  using (id = auth_usuario_id());

-- atividades (catálogo) - todos veem, só admin gerencia
create policy "Todos veem atividades ativas"
  on atividades for select
  using (ativa = true OR auth_perfil() = 'admin');

create policy "Admin gerencia atividades"
  on atividades for insert
  with check (auth_perfil() = 'admin');

create policy "Admin atualiza atividades"
  on atividades for update
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

-- subatividades
create policy "Todos veem subatividades ativas"
  on subatividades for select
  using (ativa = true OR auth_perfil() = 'admin');

create policy "Admin gerencia subatividades"
  on subatividades for all
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

-- unidades
create policy "Todos veem unidades ativas"
  on unidades for select
  using (ativa = true OR auth_perfil() = 'admin');

create policy "Admin gerencia unidades"
  on unidades for all
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

-- autorizacoes_atividade
create policy "Admin ve todas autorizacoes"
  on autorizacoes_atividade for select
  using (auth_perfil() = 'admin');

create policy "Profissional ve suas proprias autorizacoes"
  on autorizacoes_atividade for select
  using (usuario_id = auth_usuario_id());

create policy "Admin gerencia autorizacoes"
  on autorizacoes_atividade for all
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

-- registros_atividade
create policy "Admin ve todos registros"
  on registros_atividade for select
  using (auth_perfil() = 'admin');

create policy "Analista ve todos registros"
  on registros_atividade for select
  using (auth_perfil() = 'analista');

create policy "Profissional ve proprios registros"
  on registros_atividade for select
  using (profissional_id = auth_usuario_id());

create policy "Apoio ve todos registros"
  on registros_atividade for select
  using (auth_perfil() = 'apoio');

create policy "Profissional e apoio podem inserir"
  on registros_atividade for insert
  with check (
    auth_perfil() in ('profissional', 'apoio', 'admin')
  );

create policy "Profissional atualiza proprios registros"
  on registros_atividade for update
  using (profissional_id = auth_usuario_id())
  with check (profissional_id = auth_usuario_id());

create policy "Admin atualiza qualquer registro"
  on registros_atividade for update
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

create policy "Apoio atualiza qualquer registro"
  on registros_atividade for update
  using (auth_perfil() = 'apoio')
  with check (auth_perfil() = 'apoio');

-- registros_encaminhamento
create policy "Admin ve todos encaminhamentos"
  on registros_encaminhamento for select
  using (auth_perfil() = 'admin');

create policy "Operador ve proprios encaminhamentos"
  on registros_encaminhamento for select
  using (operador_id = auth_usuario_id());

create policy "Autorizados em Enfermagem podem inserir"
  on registros_encaminhamento for insert
  with check (
    exists (
      select 1 from autorizacoes_atividade aa
      join atividades a on a.id = aa.atividade_id
      where aa.usuario_id = auth_usuario_id()
        and a.nome = 'Enfermagem'
        and aa.local_obrigatorio = true
    )
  );

create policy "Admin corrige qualquer encaminhamento"
  on registros_encaminhamento for update
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

create policy "Operador corrige proprios encaminhamentos"
  on registros_encaminhamento for update
  using (operador_id = auth_usuario_id())
  with check (operador_id = auth_usuario_id());

-- descritivos_mensais
create policy "Admin ve todos descritivos"
  on descritivos_mensais for select
  using (auth_perfil() = 'admin');

create policy "Profissional ve proprios descritivos"
  on descritivos_mensais for select
  using (profissional_id = auth_usuario_id());

create policy "Apoio ve todos descritivos"
  on descritivos_mensais for select
  using (auth_perfil() = 'apoio');

create policy "Profissional e apoio podem inserir descritivos"
  on descritivos_mensais for insert
  with check (
    auth_perfil() in ('profissional', 'apoio', 'admin')
  );

create policy "Profissional atualiza proprios descritivos"
  on descritivos_mensais for update
  using (profissional_id = auth_usuario_id())
  with check (profissional_id = auth_usuario_id());

create policy "Admin atualiza qualquer descritivo"
  on descritivos_mensais for update
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

create policy "Apoio atualiza qualquer descritivo"
  on descritivos_mensais for update
  using (auth_perfil() = 'apoio')
  with check (auth_perfil() = 'apoio');

-- periodos
create policy "Todos veem periodos"
  on periodos for select
  using (true);

create policy "Admin gerencia periodos"
  on periodos for all
  using (auth_perfil() = 'admin')
  with check (auth_perfil() = 'admin');

-- notificacoes
create policy "Usuario ve suas notificacoes"
  on notificacoes for select
  using (destinatario_id = auth_usuario_id());

create policy "Usuario marca como lida"
  on notificacoes for update
  using (destinatario_id = auth_usuario_id())
  with check (destinatario_id = auth_usuario_id());

-- auditoria
create policy "Admin ve auditoria"
  on auditoria for select
  using (auth_perfil() = 'admin');

-- ============================================================
-- FUNÇÕES HELPERS
-- ============================================================

-- Verifica se um período está bloqueado para um profissional
create or replace function public.periodo_bloqueado(
  p_usuario_id uuid,
  p_mes integer,
  p_ano integer
) returns boolean
language sql stable
as $$
  select exists (
    select 1 from periodos p
    where p.usuario_id = p_usuario_id
      and p.mes = p_mes
      and p.ano = p_ano
      and p.status = 'bloqueado'
      and (p.liberado_em is null or p.liberado_por is null)
  );
$$;

-- Calcula o 5º dia útil do mês seguinte
create or replace function public.quinto_dia_util(p_data date)
returns date
language sql immutable
as $$
  select (
    select d from generate_series(
      date_trunc('month', p_data) + interval '1 month',
      date_trunc('month', p_data) + interval '1 month' + interval '9 days',
      interval '1 day'
    ) d
    where extract(dow from d) not in (0, 6)
    order by d
    limit 1 offset 4
  )::date;
$$;

-- ============================================================
-- TRIGGER: Auditoria automática (registros_atividade)
-- ============================================================
create or replace function public.trigger_auditoria_registro()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    insert into auditoria (operador_id, tabela, registro_id, acao, dados_depois)
    values (new.operador_id, TG_TABLE_NAME, new.id, 'INSERT', row_to_json(new)::jsonb);
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into auditoria (operador_id, tabela, registro_id, acao, dados_antes, dados_depois)
    values (new.operador_id, TG_TABLE_NAME, new.id, 'UPDATE', row_to_json(old)::jsonb, row_to_json(new)::jsonb);
    return new;
  end if;
  return null;
end;
$$;

create trigger trg_auditoria_registro
  after insert or update on registros_atividade
  for each row execute function public.trigger_auditoria_registro();

-- Trigger auditoria para encaminhamentos
create or replace function public.trigger_auditoria_encaminhamento()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    insert into auditoria (operador_id, tabela, registro_id, acao, dados_depois)
    values (new.operador_id, TG_TABLE_NAME, new.id, 'INSERT', row_to_json(new)::jsonb);
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into auditoria (operador_id, tabela, registro_id, acao, dados_antes, dados_depois)
    values (new.operador_id, TG_TABLE_NAME, new.id, 'UPDATE', row_to_json(old)::jsonb, row_to_json(new)::jsonb);
    return new;
  end if;
  return null;
end;
$$;

create trigger trg_auditoria_encaminhamento
  after insert or update on registros_encaminhamento
  for each row execute function public.trigger_auditoria_encaminhamento();

-- ============================================================
-- TRIGGER: Notificação quando Apoio lança para Profissional
-- ============================================================
create or replace function public.trigger_notificacao_lancamento()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.operador_id != new.profissional_id then
    insert into notificacoes (destinatario_id, mensagem)
    values (
      new.profissional_id,
      format(
        'Lançamento realizado em seu nome: %s — Data: %s, Idosos: %s, PCD: %s, Colab: %s',
        (select nome from atividades where id = new.atividade_id),
        new.data_referencia,
        new.qtd_idosos,
        new.qtd_pcd,
        new.qtd_colaboradores
      )
    );
  end if;
  return new;
end;
$$;

create trigger trg_notificacao_lancamento
  after insert on registros_atividade
  for each row execute function public.trigger_notificacao_lancamento();

-- ============================================================
-- TRIGGER: Bloqueio automático no 5º dia útil
-- ============================================================
create or replace function public.trigger_bloqueio_automatico()
returns trigger
language plpgsql
security definer
as $$
declare
  v_quinto_dia date;
begin
  v_quinto_dia := public.quinto_dia_util(new.data_referencia);
  if current_date > v_quinto_dia then
    insert into periodos (usuario_id, mes, ano, status, prazo_limite)
    values (
      new.profissional_id,
      extract(month from new.data_referencia)::smallint,
      extract(year from new.data_referencia)::smallint,
      'bloqueado',
      v_quinto_dia
    )
    on conflict (usuario_id, mes, ano) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_bloqueio_automatico
  after insert on registros_atividade
  for each row execute function public.trigger_bloqueio_automatico();

-- ============================================================
-- SEED: Admin padrão
-- ============================================================
insert into usuarios (id, nome_completo, area_profissao, email, perfil, tem_login)
values
  ('00000000-0000-0000-0000-000000000001', 'Dério Milke', 'Administração', 'admin@pella.com.br', 'admin', true);
