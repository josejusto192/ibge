-- ============================================================
-- Segurança: valores importantes passam a ser decididos pelo servidor
-- ============================================================
-- Antes, o navegador gravava direto na tabela e o banco confiava:
--   * usuarios.is_admin / is_editor → qualquer aluno podia se tornar admin
--     (e, como admin, ganhar acesso de assinante) pelo console do navegador;
--   * usuarios.xp / streak / ultimo_estudo → dava pra inventar pontos e
--     ofensiva (ranking);
--   * progresso_questoes.acertou → dava pra marcar "acertei" sem acertar;
--   * progresso_modulos → dava pra concluir módulo sem responder;
--   * indicacoes.status / credito_gerado → dava pra forjar indicação paga.
--
-- Agora:
--   * o aluno responde pela função responder_questao(): o banco confere o
--     gabarito, grava a resposta, dá o XP (10 por questão, uma única vez) e
--     atualiza a ofensiva (dia de Brasília);
--   * as colunas acima só mudam pelo servidor (ou por admin, nos papéis);
--   * concluir módulo recalcula acertos/total a partir das respostas
--     gravadas e exige todas as questões respondidas.
-- ============================================================

-- ---- XP concedido uma única vez por questão ----
alter table public.progresso_questoes add column if not exists xp_concedido boolean not null default false;
-- respostas antigas certas já renderam XP no app antigo
update public.progresso_questoes set xp_concedido = true where acertou and not xp_concedido;

-- ---- usuarios: colunas que o navegador não pode mais escolher ----
create or replace function public.protege_colunas_servidor()
returns trigger
language plpgsql
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  -- responder_questao() liga isso só dentro da própria transação
  pelo_servidor boolean := coalesce(current_setting('foco.servidor', true), '') = '1';
begin
  if papel in ('anon', 'authenticated') and not pelo_servidor then
    if tg_op = 'INSERT' then
      new.asaas_customer_id := null;
      new.asaas_sincronizado_em := null;
      new.asaas_sync_erro := null;
      new.acesso_ate := null;
      new.assinatura_cortesia := false;
      new.is_admin := false;
      new.is_editor := false;
      new.xp := 0;
      new.streak := 0;
      new.ultimo_estudo := null;
    else
      if new.asaas_customer_id is distinct from old.asaas_customer_id
         or new.asaas_sincronizado_em is distinct from old.asaas_sincronizado_em
         or new.asaas_sync_erro is distinct from old.asaas_sync_erro then
        raise exception 'Campos do Asaas só podem ser alterados pelo servidor.';
      end if;
      new.acesso_ate := old.acesso_ate;
      -- pontos e ofensiva: só responder_questao() mexe
      new.xp := old.xp;
      new.streak := old.streak;
      new.ultimo_estudo := old.ultimo_estudo;
      if not public.is_admin() then
        new.assinatura_cortesia := old.assinatura_cortesia;
        new.is_admin := old.is_admin;
        new.is_editor := old.is_editor;
      end if;
    end if;
  end if;

  new.assinatura_ativa := new.assinatura_cortesia or coalesce(new.acesso_ate > now(), false);
  return new;
end;
$$;

-- ---- Questão liberada pro aluno? (1º módulo grátis ou assinante) ----
-- Usada por responder_questao e pela função do Foco (tutor-ia).
create or replace function public.questao_liberada(p_questao_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.modulo_questoes mq
    where mq.questao_id = p_questao_id and public.modulo_liberado(mq.modulo_id)
  );
$$;

revoke execute on function public.questao_liberada(uuid) from public, anon;
grant execute on function public.questao_liberada(uuid) to authenticated;

-- ---- Responder questão (trilha e caderno de erros) ----
create or replace function public.responder_questao(p_questao_id uuid, p_letra text)
returns table (acertou boolean, xp_ganho int, xp int, streak int, ultimo_estudo date, ofensiva_nova int)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_gabarito text;
  v_acertou boolean;
  v_ja_tinha_xp boolean;
  v_ganho int := 0;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_usuario public.usuarios%rowtype;
  v_nova int := null;
begin
  if v_uid is null then
    raise exception 'Faça login para responder.';
  end if;

  -- só questões de módulos que o aluno pode abrir (1º módulo grátis ou assinante)
  if not public.questao_liberada(p_questao_id) then
    raise exception 'ASSINATURA_NECESSARIA';
  end if;

  select q.gabarito_letra::text into v_gabarito from public.questoes q where q.id = p_questao_id;
  if v_gabarito is null then
    raise exception 'Questão não encontrada.';
  end if;
  v_acertou := upper(trim(coalesce(p_letra, ''))) = upper(trim(v_gabarito));

  -- vale a resposta mais recente (caderno de erros)
  select pq.xp_concedido into v_ja_tinha_xp
  from public.progresso_questoes pq
  where pq.usuario_id = v_uid and pq.questao_id = p_questao_id;

  if v_acertou and not coalesce(v_ja_tinha_xp, false) then
    v_ganho := 10;
  end if;

  insert into public.progresso_questoes as pq (usuario_id, questao_id, acertou, respondido_em, xp_concedido)
  values (v_uid, p_questao_id, v_acertou, now(), v_ganho > 0)
  on conflict (usuario_id, questao_id) do update
    set acertou = excluded.acertou,
        respondido_em = excluded.respondido_em,
        xp_concedido = pq.xp_concedido or excluded.xp_concedido;

  perform set_config('foco.servidor', '1', true);

  select * into v_usuario from public.usuarios u where u.id = v_uid for update;
  if v_usuario.ultimo_estudo is distinct from v_hoje then
    v_nova := case when v_usuario.ultimo_estudo = v_hoje - 1 then v_usuario.streak + 1 else 1 end;
  end if;

  update public.usuarios u
    set xp = u.xp + v_ganho,
        streak = coalesce(v_nova, u.streak),
        ultimo_estudo = v_hoje
    where u.id = v_uid
    returning u.xp, u.streak, u.ultimo_estudo into v_usuario.xp, v_usuario.streak, v_usuario.ultimo_estudo;

  perform set_config('foco.servidor', '', true);

  return query select v_acertou, v_ganho, v_usuario.xp, v_usuario.streak, v_usuario.ultimo_estudo, v_nova;
end;
$$;

revoke execute on function public.responder_questao(uuid, text) from public, anon;
grant execute on function public.responder_questao(uuid, text) to authenticated;

-- respostas só entram pela função acima
drop policy if exists "progresso: inserção própria" on public.progresso_questoes;
drop policy if exists "progresso: atualização própria" on public.progresso_questoes;

-- ---- Concluir módulo: números vêm das respostas gravadas ----
create or replace function public.progresso_modulos_confere()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
  v_total int;
  v_respondidas int;
  v_acertos int;
begin
  if papel not in ('anon', 'authenticated') then
    return new;
  end if;
  if not public.modulo_liberado(new.modulo_id) then
    raise exception 'ASSINATURA_NECESSARIA';
  end if;

  select count(*)::int, count(pq.questao_id)::int, count(*) filter (where pq.acertou)::int
    into v_total, v_respondidas, v_acertos
  from public.modulo_questoes mq
  left join public.progresso_questoes pq on pq.questao_id = mq.questao_id and pq.usuario_id = new.usuario_id
  where mq.modulo_id = new.modulo_id;

  if v_respondidas < v_total then
    raise exception 'Responda todas as questões do módulo antes de concluir.';
  end if;

  new.acertos := v_acertos;
  new.total := v_total;
  return new;
end;
$$;

drop trigger if exists trg_progresso_modulos_confere on public.progresso_modulos;
create trigger trg_progresso_modulos_confere
  before insert or update on public.progresso_modulos
  for each row execute function public.progresso_modulos_confere();

-- ---- Indicações: o aluno só registra "fui indicado", nunca o resultado ----
create or replace function public.indicacoes_confere()
returns trigger
language plpgsql
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if papel in ('anon', 'authenticated') then
    if new.indicador_id = new.indicado_user_id then
      raise exception 'Não é possível indicar a si mesmo.';
    end if;
    new.status := 'pendente';
    new.credito_gerado := 0;
    new.confirmado_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_indicacoes_confere on public.indicacoes;
create trigger trg_indicacoes_confere
  before insert on public.indicacoes
  for each row execute function public.indicacoes_confere();

-- uma indicação por pessoa indicada (se já houver duplicadas, não trava a migration)
do $$
begin
  if not exists (
    select 1 from public.indicacoes where indicado_user_id is not null
    group by indicado_user_id having count(*) > 1
  ) then
    create unique index if not exists indicacoes_indicado_unico on public.indicacoes (indicado_user_id);
  end if;
end $$;
