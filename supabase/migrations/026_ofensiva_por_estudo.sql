-- ============================================================
-- Ofensiva (dias seguidos) passa a contar ESTUDO, não abertura do app
-- ============================================================
-- Antes a sequência subia só de abrir o app (useUsuario atualizava
-- streak pelo ultimo_acesso). Agora, como no Duolingo, ela só cresce
-- quando o aluno responde a 1ª questão do dia (trilha ou caderno de erros):
--   estudou ontem      → streak + 1
--   estudou hoje       → não muda
--   pulou um dia       → recomeça em 1
-- ultimo_acesso continua existindo (métrica "ativos hoje" do admin).
--
-- A ofensiva que aparece é a "efetiva": se o último estudo foi antes de
-- ontem, ela já está perdida e aparece 0 (mesmo que streak ainda guarde o
-- número antigo até o próximo estudo). get_ranking passa a mostrar assim.
-- ============================================================

alter table public.usuarios add column if not exists ultimo_estudo date;

create or replace function public.get_ranking(p_limit int default 50)
returns table (id uuid, nome text, xp int, streak int)
language sql
security definer
set search_path = public
as $$
  select
    id,
    coalesce(nome, 'Concurseiro')::text,
    xp,
    case
      when ultimo_estudo >= (now() at time zone 'America/Sao_Paulo')::date - 1 then streak
      else 0
    end
  from public.usuarios
  order by xp desc
  limit p_limit;
$$;

grant execute on function public.get_ranking(int) to authenticated;
