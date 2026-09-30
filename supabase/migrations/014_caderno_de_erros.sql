-- ============================================================
-- Caderno de erros (por trilha, com "responder de novo")
-- ============================================================
-- Antes só existia policy de leitura/inserção própria em
-- progresso_questoes — faltava UPDATE, necessária pro "responder de novo"
-- fazer upsert (mesma linha, acertou pode virar true numa segunda tentativa).
create policy "progresso: atualização própria"
  on public.progresso_questoes for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- Contagem rápida (pro badge do botão flutuante na trilha) — não busca o
-- conteúdo da questão, só quantas o aluno errou e ainda não acertou,
-- dentro de uma trilha específica.
create or replace function public.contar_minhas_questoes_erradas(p_trilha_id int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct pq.questao_id)::int
  from public.progresso_questoes pq
  join public.modulo_questoes mq on mq.questao_id = pq.questao_id
  join public.modulos m on m.id = mq.modulo_id
  where pq.usuario_id = auth.uid()
    and pq.acertou = false
    and m.trilha_id = p_trilha_id;
$$;

grant execute on function public.contar_minhas_questoes_erradas(int) to authenticated;

-- Conteúdo completo das questões erradas (pra tela de revisão/retry).
-- security definer pra poder ler `questoes` (RLS restringe a admin), mas
-- sempre travado a auth.uid() — nunca aceita usuario_id como parâmetro,
-- então não dá pra consultar os erros de outra pessoa.
create or replace function public.get_minhas_questoes_erradas(p_trilha_id int)
returns table (
  id uuid, enunciado text, enunciado_html text, tem_imagem boolean,
  gabarito_letra text, comentario text, comentario_html text,
  banca text, ano smallint, orgao text, orgao_nome text, cargo text,
  disciplina text, nivel_escolaridade text, tipo text,
  anulada boolean, desatualizada boolean, alternativas jsonb
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
    q.nivel_escolaridade, q.tipo, q.anulada, q.desatualizada, q.alternativas
  from public.questoes q
  join public.modulo_questoes mq on mq.questao_id = q.id
  join public.modulos m on m.id = mq.modulo_id
  join public.progresso_questoes pq on pq.questao_id = q.id
  where pq.usuario_id = auth.uid()
    and pq.acertou = false
    and m.trilha_id = p_trilha_id;
$$;

grant execute on function public.get_minhas_questoes_erradas(int) to authenticated;
