-- ============================================================
-- Asaas: planos, assinaturas, cobranças e webhooks
-- ============================================================
-- Fluxo:
--   1. Aluno escolhe um plano e informa o CPF → Edge Function asaas-assinar
--      cria/atualiza o cliente, cria a assinatura no Asaas e devolve o link
--      da fatura (invoiceUrl) da 1ª cobrança.
--   2. O Asaas avisa tudo por webhook → Edge Function asaas-webhook grava o
--      evento em asaas_webhook_eventos (id do evento = chave única, o Asaas
--      entrega "at least once") e chama asaas_processar_evento().
--   3. asaas_processar_evento() atualiza assinaturas/pagamentos e recalcula
--      usuarios.acesso_ate.
--
-- Acesso: usuarios.acesso_ate é DERIVADO dos pagamentos confirmados
-- (vencimento + 1 ciclo do plano + tolerância) — não importa a ordem em que
-- os eventos chegam, estorno/chargeback somem da conta sozinhos.
-- usuarios.assinatura_ativa = assinatura_cortesia OU acesso_ate no futuro,
-- calculado pelo banco em toda gravação (trigger) e por um job de hora em
-- hora (pg_cron) pra quem venceu. Nunca vem do navegador.
-- ============================================================

create extension if not exists pg_cron;


-- ---- usuarios: acesso ----
alter table public.usuarios
  add column if not exists assinatura_cortesia boolean not null default false,
  add column if not exists acesso_ate timestamptz;

alter table public.usuarios alter column assinatura_ativa set default false;

-- Quem já tem acesso hoje (todo mundo, até aqui o cadastro marcava true)
-- vira cortesia: ninguém perde acesso sem o admin decidir. Pra cortar todos
-- de uma vez depois: update usuarios set assinatura_cortesia = false;
update public.usuarios set assinatura_cortesia = true where assinatura_ativa = true and assinatura_cortesia = false;


-- ---- Colunas controladas pelo servidor ----
-- Substitui o trigger da migration 020 (só protegia asaas_*). A policy
-- "usuarios: atualização própria" deixa o aluno gravar a linha inteira,
-- então qualquer coluna de cobrança/acesso vinda do navegador é ignorada.
-- Admin (is_admin) pode dar/tirar cortesia pela tela de usuários.
drop trigger if exists trg_usuarios_protege_asaas on public.usuarios;
drop function if exists public.protege_colunas_asaas();

create or replace function public.protege_colunas_servidor()
returns trigger
language plpgsql
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if papel in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.asaas_customer_id := null;
      new.asaas_sincronizado_em := null;
      new.asaas_sync_erro := null;
      new.acesso_ate := null;
      new.assinatura_cortesia := false;
    else
      if new.asaas_customer_id is distinct from old.asaas_customer_id
         or new.asaas_sincronizado_em is distinct from old.asaas_sincronizado_em
         or new.asaas_sync_erro is distinct from old.asaas_sync_erro then
        raise exception 'Campos do Asaas só podem ser alterados pelo servidor.';
      end if;
      new.acesso_ate := old.acesso_ate;
      if not public.is_admin() then
        new.assinatura_cortesia := old.assinatura_cortesia;
      end if;
    end if;
  end if;

  new.assinatura_ativa := new.assinatura_cortesia or coalesce(new.acesso_ate > now(), false);
  return new;
end;
$$;

drop trigger if exists trg_usuarios_protege_servidor on public.usuarios;
create trigger trg_usuarios_protege_servidor
  before insert or update on public.usuarios
  for each row execute function public.protege_colunas_servidor();


-- ---- planos (o admin cadastra; o aluno vê os ativos) ----
create table if not exists public.planos (
  id         serial primary key,
  nome       text not null,
  descricao  text,
  valor      numeric(10, 2) not null check (valor > 0),
  ciclo      text not null default 'MONTHLY'
             check (ciclo in ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY')),
  ativo      boolean not null default true,
  ordem      int not null default 0,
  criado_em  timestamptz not null default now()
);

alter table public.planos enable row level security;

drop policy if exists "planos: leitura dos ativos" on public.planos;
create policy "planos: leitura dos ativos"
  on public.planos for select
  to authenticated
  using (ativo or is_admin());

drop policy if exists "planos: escrita admin" on public.planos;
create policy "planos: escrita admin"
  on public.planos for all
  using (is_admin())
  with check (is_admin());


-- ---- assinaturas (espelho das assinaturas do Asaas) ----
create table if not exists public.assinaturas (
  id                     bigserial primary key,
  asaas_subscription_id  text not null unique,
  usuario_id             uuid references public.usuarios(id) on delete set null,
  plano_id               int references public.planos(id) on delete set null,
  status                 text not null,          -- ACTIVE | INACTIVE | EXPIRED | DELETED
  billing_type           text,
  valor                  numeric(10, 2),
  ciclo                  text,
  proximo_vencimento     date,
  evento_em              timestamp,              -- dateCreated do último evento aplicado
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create index if not exists assinaturas_usuario_idx on public.assinaturas(usuario_id);

-- ---- pagamentos (cobranças geradas pelas assinaturas) ----
create table if not exists public.pagamentos (
  id                     bigserial primary key,
  asaas_payment_id       text not null unique,
  asaas_subscription_id  text,                   -- sem FK: a cobrança pode chegar antes da assinatura
  usuario_id             uuid references public.usuarios(id) on delete set null,
  status                 text not null,          -- PENDING | CONFIRMED | RECEIVED | OVERDUE | REFUNDED | ... | DELETED
  billing_type           text,
  valor                  numeric(10, 2),
  vencimento             date,
  pago_em                date,
  invoice_url            text,
  evento_em              timestamp,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);

create index if not exists pagamentos_usuario_idx on public.pagamentos(usuario_id);
create index if not exists pagamentos_assinatura_idx on public.pagamentos(asaas_subscription_id);

alter table public.assinaturas enable row level security;
alter table public.pagamentos enable row level security;

-- Aluno lê só os próprios; ninguém escreve pelo navegador (só service_role).
drop policy if exists "assinaturas: leitura própria" on public.assinaturas;
create policy "assinaturas: leitura própria"
  on public.assinaturas for select
  using (auth.uid() = usuario_id or is_admin());

drop policy if exists "pagamentos: leitura própria" on public.pagamentos;
create policy "pagamentos: leitura própria"
  on public.pagamentos for select
  using (auth.uid() = usuario_id or is_admin());


-- ---- asaas_webhook_eventos: persiste antes de processar (idempotência) ----
create table if not exists public.asaas_webhook_eventos (
  id              bigserial primary key,
  asaas_event_id  text not null unique,
  evento          text not null,
  payload         jsonb not null,
  status          text not null default 'PENDENTE' check (status in ('PENDENTE', 'PROCESSADO', 'ERRO')),
  erro            text,
  recebido_em     timestamptz not null default now(),
  processado_em   timestamptz
);

alter table public.asaas_webhook_eventos enable row level security;

drop policy if exists "asaas_webhook_eventos: leitura admin" on public.asaas_webhook_eventos;
create policy "asaas_webhook_eventos: leitura admin"
  on public.asaas_webhook_eventos for select
  using (is_admin());


-- ---- Regras de acesso ----
create or replace function public.asaas_intervalo_ciclo(p_ciclo text)
returns interval
language sql
immutable
as $$
  select case p_ciclo
    when 'WEEKLY' then interval '7 days'
    when 'BIWEEKLY' then interval '14 days'
    when 'BIMONTHLY' then interval '2 months'
    when 'QUARTERLY' then interval '3 months'
    when 'SEMIANNUALLY' then interval '6 months'
    when 'YEARLY' then interval '1 year'
    else interval '1 month'
  end;
$$;

-- acesso_ate = maior (vencimento + ciclo) entre as cobranças pagas + 3 dias
-- de tolerância (tempo pro boleto/Pix da próxima cobrança compensar).
create or replace function public.asaas_recalcular_acesso(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ate timestamptz;
begin
  select max((p.vencimento + public.asaas_intervalo_ciclo(a.ciclo))::timestamp at time zone 'America/Sao_Paulo')
    into v_ate
  from public.pagamentos p
  join public.assinaturas a on a.asaas_subscription_id = p.asaas_subscription_id
  where p.usuario_id = p_usuario_id
    and p.status in ('CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH');

  update public.usuarios
     set acesso_ate = v_ate + interval '3 days'
   where id = p_usuario_id
     and acesso_ate is distinct from v_ate + interval '3 days';
end;
$$;

revoke execute on function public.asaas_recalcular_acesso(uuid) from public, anon, authenticated;
grant execute on function public.asaas_recalcular_acesso(uuid) to service_role;


-- ---- Processamento de um evento ----
-- Idempotente e tolerante a ordem: cada linha guarda o dateCreated do último
-- evento aplicado e ignora eventos mais antigos. Pode ser reexecutado à mão
-- no SQL Editor: select asaas_processar_evento(<id>);
create or replace function public.asaas_processar_evento(p_evento_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.asaas_webhook_eventos%rowtype;
  s jsonb;
  p jsonb;
  v_quando timestamp;
  v_usuario uuid;
begin
  select * into e from public.asaas_webhook_eventos where id = p_evento_id for update;
  if not found then
    return 'NAO_ENCONTRADO';
  end if;
  if e.status = 'PROCESSADO' then
    return 'PROCESSADO';
  end if;

  begin
    v_quando := coalesce((e.payload ->> 'dateCreated')::timestamp, e.recebido_em::timestamp);

    if jsonb_typeof(e.payload -> 'subscription') = 'object' then
      s := e.payload -> 'subscription';
      select id into v_usuario from public.usuarios where asaas_customer_id = s ->> 'customer';
      if v_usuario is null then
        select id into v_usuario from public.usuarios where id::text = s ->> 'externalReference';
      end if;

      insert into public.assinaturas as a
        (asaas_subscription_id, usuario_id, status, billing_type, valor, ciclo, proximo_vencimento, evento_em)
      values (
        s ->> 'id',
        v_usuario,
        case when e.evento = 'SUBSCRIPTION_DELETED' or (s ->> 'deleted')::boolean then 'DELETED' else s ->> 'status' end,
        s ->> 'billingType',
        (s ->> 'value')::numeric,
        s ->> 'cycle',
        (s ->> 'nextDueDate')::date,
        v_quando
      )
      on conflict (asaas_subscription_id) do update set
        usuario_id = coalesce(excluded.usuario_id, a.usuario_id),
        status = excluded.status,
        billing_type = excluded.billing_type,
        valor = excluded.valor,
        ciclo = excluded.ciclo,
        proximo_vencimento = excluded.proximo_vencimento,
        evento_em = excluded.evento_em,
        atualizado_em = now()
      where a.evento_em is null or a.evento_em <= excluded.evento_em;

      select usuario_id into v_usuario from public.assinaturas where asaas_subscription_id = s ->> 'id';

    elsif jsonb_typeof(e.payload -> 'payment') = 'object' then
      p := e.payload -> 'payment';
      select usuario_id into v_usuario from public.assinaturas where asaas_subscription_id = p ->> 'subscription';
      if v_usuario is null then
        select id into v_usuario from public.usuarios where asaas_customer_id = p ->> 'customer';
      end if;

      insert into public.pagamentos as pg
        (asaas_payment_id, asaas_subscription_id, usuario_id, status, billing_type, valor, vencimento, pago_em, invoice_url, evento_em)
      values (
        p ->> 'id',
        p ->> 'subscription',
        v_usuario,
        case when e.evento = 'PAYMENT_DELETED' or (p ->> 'deleted')::boolean then 'DELETED' else p ->> 'status' end,
        p ->> 'billingType',
        (p ->> 'value')::numeric,
        (p ->> 'dueDate')::date,
        coalesce((p ->> 'clientPaymentDate')::date, (p ->> 'paymentDate')::date, (p ->> 'confirmedDate')::date),
        p ->> 'invoiceUrl',
        v_quando
      )
      on conflict (asaas_payment_id) do update set
        asaas_subscription_id = coalesce(excluded.asaas_subscription_id, pg.asaas_subscription_id),
        usuario_id = coalesce(excluded.usuario_id, pg.usuario_id),
        status = excluded.status,
        billing_type = excluded.billing_type,
        valor = excluded.valor,
        vencimento = excluded.vencimento,
        pago_em = coalesce(excluded.pago_em, pg.pago_em),
        invoice_url = coalesce(excluded.invoice_url, pg.invoice_url),
        evento_em = excluded.evento_em,
        atualizado_em = now()
      where pg.evento_em is null or pg.evento_em <= excluded.evento_em;

      select usuario_id into v_usuario from public.pagamentos where asaas_payment_id = p ->> 'id';
    end if;

    if v_usuario is not null then
      perform public.asaas_recalcular_acesso(v_usuario);
    end if;

    update public.asaas_webhook_eventos
       set status = 'PROCESSADO', erro = null, processado_em = now()
     where id = p_evento_id;
    return 'PROCESSADO';
  exception when others then
    update public.asaas_webhook_eventos
       set status = 'ERRO', erro = sqlerrm, processado_em = now()
     where id = p_evento_id;
    insert into public.client_errors (mensagem, contexto)
    values (left('Webhook Asaas ' || e.evento || ': ' || sqlerrm, 2000), 'asaas-webhook · evento ' || e.asaas_event_id);
    return 'ERRO';
  end;
end;
$$;

revoke execute on function public.asaas_processar_evento(bigint) from public, anon, authenticated;
grant execute on function public.asaas_processar_evento(bigint) to service_role;


-- ---- Expiração: desliga quem passou do acesso_ate ----
-- O trigger recalcula assinatura_ativa em qualquer UPDATE; aqui só "toca"
-- as linhas vencidas.
do $$
begin
  perform cron.unschedule('asaas-expirar-acessos') where exists (select 1 from cron.job where jobname = 'asaas-expirar-acessos');
  perform cron.schedule(
    'asaas-expirar-acessos',
    '7 * * * *',
    $job$update public.usuarios set acesso_ate = acesso_ate
         where assinatura_ativa and not assinatura_cortesia and (acesso_ate is null or acesso_ate <= now())$job$
  );
end $$;
