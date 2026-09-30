-- ============================================================
-- Rate limit do Tutor de IA (proteção de custo do Gemini)
-- ============================================================
-- Qualquer aluno logado podia chamar a edge function tutor-ia sem limite —
-- cada chamada custa dinheiro na API do Gemini. Agora cada resposta
-- bem-sucedida é registrada em tutor_ia_usos e a função recusa (429) quem
-- estourar o limite diário, configurável pelo admin em configuracoes_ia.
-- ============================================================

alter table public.configuracoes_ia
  add column if not exists tutor_limite_diario int not null default 20;

create table if not exists public.tutor_ia_usos (
  id         bigserial primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  usado_em   timestamptz not null default now()
);

create index if not exists tutor_ia_usos_usuario_dia on public.tutor_ia_usos (usuario_id, usado_em);

-- RLS ligada SEM policies de propósito: só a edge function (service_role,
-- que ignora RLS) lê/escreve — o client nunca toca nesta tabela.
alter table public.tutor_ia_usos enable row level security;

-- A RPC de configurações passa a devolver também o limite diário.
drop function if exists public.admin_get_configuracoes_ia();
create or replace function public.admin_get_configuracoes_ia()
returns table (
  modelo text,
  prompt_extra text,
  tutor_prompt_extra text,
  tutor_limite_diario int,
  api_key_configurada boolean,
  atualizado_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select modelo, prompt_extra, tutor_prompt_extra, tutor_limite_diario,
         (api_key is not null and api_key <> '') as api_key_configurada, atualizado_em
  from public.configuracoes_ia
  where id = 1 and is_admin();
$$;

grant execute on function public.admin_get_configuracoes_ia() to authenticated;
