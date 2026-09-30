-- ============================================================
-- Fecha a brecha do "Desmarcar" revisão de questão já em módulo
-- ============================================================
-- O trigger da migration 005 (trg_modulo_questoes_revisada) impede questão
-- não-revisada de ENTRAR num módulo, mas não impedia desmarcar a revisão
-- de uma questão que JÁ ESTÁ em um módulo — o aluno passaria a ver o
-- comentário original raspado como fallback em get_modulo_questoes().
--
-- Bloqueia (em vez de remover dos módulos automaticamente) de propósito:
-- remover em silêncio alteraria trilhas que alunos já estão estudando.
-- O admin precisa tirar a questão dos módulos primeiro, conscientemente.
-- ============================================================

create or replace function public.check_revisao_em_uso()
returns trigger
language plpgsql
as $$
begin
  if old.revisado = true and new.revisado = false
     and exists (select 1 from public.modulo_questoes where questao_id = new.id) then
    raise exception 'Esta questão está em uso em um módulo — remova-a dos módulos antes de desmarcar a revisão.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_questoes_revisao_em_uso on public.questoes;
create trigger trg_questoes_revisao_em_uso
  before update of revisado on public.questoes
  for each row execute function public.check_revisao_em_uso();
