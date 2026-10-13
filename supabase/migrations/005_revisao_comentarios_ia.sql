-- ============================================================
-- Revisão de comentários (IA ou manual) antes de usar a questão
-- ============================================================
-- O comentário original de `questoes` vem raspado de terceiros e não pode
-- ser exibido aos alunos como está. Este arquivo adiciona:
--   1. Campos de revisão em `questoes` (comentário reescrito + status).
--   2. Um trigger que IMPEDE colocar uma questão não revisada em um módulo
--      (barreira no banco, não só na UI).
--   3. `configuracoes_ia`: modelo/chave/prompt extra do revisor de IA
--      (Google Gemini) — só admin lê/escreve; a Edge Function usa a
--      service_role para ler a api_key (nunca é exposta ao navegador).
--   4. get_modulo_questoes() passa a devolver o comentário REVISADO
--      (nunca o original raspado).
-- ============================================================


-- ---- questoes: campos de revisão ----
alter table public.questoes
  add column if not exists comentario_revisado text,
  add column if not exists comentario_revisado_html text,
  add column if not exists revisado boolean not null default false,
  add column if not exists revisado_em timestamptz,
  add column if not exists revisado_metodo text, -- 'ia' | 'manual'
  add column if not exists revisado_por uuid references public.usuarios(id);


-- ---- trigger: só entra em um módulo quem já foi revisado ----
create or replace function public.check_questao_revisada()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.questoes where id = new.questao_id and revisado = true) then
    raise exception 'Questão % ainda não foi revisada — revise o comentário antes de usá-la em um módulo.', new.questao_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_modulo_questoes_revisada on public.modulo_questoes;
create trigger trg_modulo_questoes_revisada
  before insert or update on public.modulo_questoes
  for each row execute function public.check_questao_revisada();


-- ---- configuracoes_ia: modelo/chave/prompt extra do revisor (linha única, id=1) ----
create table if not exists public.configuracoes_ia (
  id            int primary key default 1 check (id = 1),
  modelo        text not null default 'gemini-2.5-flash',
  api_key       text,
  prompt_extra  text,
  atualizado_em timestamptz not null default now()
);
insert into public.configuracoes_ia (id) values (1) on conflict (id) do nothing;

alter table public.configuracoes_ia enable row level security;

create policy "configuracoes_ia: leitura admin"
  on public.configuracoes_ia for select
  using (is_admin());

create policy "configuracoes_ia: escrita admin"
  on public.configuracoes_ia for update
  using (is_admin())
  with check (is_admin());


-- ---- get_modulo_questoes: devolve o comentário revisado, nunca o original ----
create or replace function public.get_modulo_questoes(p_modulo_id int)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    q.id, q.enunciado, q.enunciado_html, q.tem_imagem, q.gabarito_letra,
    coalesce(q.comentario_revisado, q.comentario) as comentario,
    coalesce(q.comentario_revisado_html, q.comentario_html) as comentario_html,
    q.banca, q.ano, q.orgao, q.orgao_nome, q.cargo, q.disciplina,
    q.nivel_escolaridade, q.tipo, q.anulada, q.desatualizada, q.alternativas
  from public.questoes q
  join public.modulo_questoes mq on mq.questao_id = q.id
  where mq.modulo_id = p_modulo_id
  order by mq.ordem;
$$;

grant execute on function public.get_modulo_questoes(int) to authenticated;
