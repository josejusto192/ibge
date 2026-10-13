-- ============================================================
-- Biblioteca de aulas (independente de trilha/módulo)
-- ============================================================
-- Até aqui uma aula só existia como um módulo tipo 'aula' preso a uma
-- trilha (migration 008). Agora:
--   1. `aulas` é uma biblioteca própria (aba "Aulas" no admin): a aula é
--      cadastrada uma vez, sem precisar de trilha.
--   2. `modulos.aula_id`: um módulo tipo 'aula' aponta para uma aula da
--      biblioteca (a mesma aula pode ser usada em várias trilhas).
--      `modulos.video_url` continua existindo só como fallback legado.
--   3. `questoes.aula_id`: aula de apoio opcional da questão. Aparece SÓ no
--      caderno de erros (não na trilha), para o aluno assistir se quiser.
--   4. get_minhas_questoes_erradas() passa a devolver a aula vinculada.
-- ============================================================

create table if not exists public.aulas (
  id         serial primary key,
  titulo     text not null,
  descricao  text,
  video_url  text not null,
  criado_em  timestamptz not null default now()
);

alter table public.aulas enable row level security;

-- Aluno logado precisa ler (título/vídeo das aulas no caminho da trilha).
drop policy if exists "aulas: leitura autenticada" on public.aulas;
create policy "aulas: leitura autenticada"
  on public.aulas for select
  to authenticated
  using (true);

drop policy if exists "aulas: escrita equipe" on public.aulas;
create policy "aulas: escrita equipe"
  on public.aulas for all
  using (is_conteudo_admin())
  with check (is_conteudo_admin());


-- ---- modulos.aula_id ----
-- restrict: excluir uma aula que está no caminho de uma trilha mudaria o
-- que alunos estão vendo — o admin tira dos módulos primeiro.
alter table public.modulos
  add column if not exists aula_id int references public.aulas(id) on delete restrict;

create index if not exists modulos_aula_id_idx on public.modulos(aula_id);

-- Migra as aulas que já existiam como módulo para a biblioteca.
do $$
declare
  m record;
  nova_aula_id int;
begin
  for m in
    select id, titulo, video_url from public.modulos
    where tipo = 'aula' and aula_id is null and video_url is not null and btrim(video_url) <> ''
  loop
    insert into public.aulas (titulo, video_url) values (m.titulo, m.video_url) returning id into nova_aula_id;
    update public.modulos set aula_id = nova_aula_id where id = m.id;
  end loop;
end $$;


-- ---- questoes.aula_id ----
-- set null: a aula de apoio é opcional, excluir a aula só tira o link.
alter table public.questoes
  add column if not exists aula_id int references public.aulas(id) on delete set null;

create index if not exists questoes_aula_id_idx on public.questoes(aula_id);


-- ---- caderno de erros: devolve a aula de apoio ----
-- Muda o tipo de retorno, então precisa dropar antes de recriar.
drop function if exists public.get_minhas_questoes_erradas(int);

create function public.get_minhas_questoes_erradas(p_trilha_id int)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb,
  aula_titulo text, aula_video_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    q.id, q.enunciado, q.enunciado_html, q.tem_imagem, q.gabarito_letra,
    coalesce(q.comentario_revisado, q.comentario) as comentario,
    coalesce(q.comentario_revisado_html, q.comentario_html) as comentario_html,
    q.banca, q.ano, q.orgao, q.orgao_nome, q.cargo, q.disciplina,
    q.nivel_escolaridade, q.tipo, q.anulada, q.desatualizada, q.alternativas,
    a.titulo as aula_titulo, a.video_url as aula_video_url
  from public.questoes q
  join public.modulo_questoes mq on mq.questao_id = q.id
  join public.modulos m on m.id = mq.modulo_id
  join public.progresso_questoes pq on pq.questao_id = q.id
  left join public.aulas a on a.id = q.aula_id
  where pq.usuario_id = auth.uid()
    and pq.acertou = false
    and m.trilha_id = p_trilha_id;
$$;

grant execute on function public.get_minhas_questoes_erradas(int) to authenticated;
