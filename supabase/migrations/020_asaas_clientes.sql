-- ============================================================
-- Asaas: cliente (customer) por usuário, sincronizado automaticamente
-- ============================================================
-- Cada usuário vira um cliente no Asaas (POST /v3/customers) e guardamos o
-- id devolvido (cus_...) em usuarios.asaas_customer_id — usado depois nas
-- assinaturas. O Asaas EXIGE cpfCnpj pra criar o cliente, então o cliente
-- só é criado quando o usuário tiver CPF.
--
-- Sincronização: um trigger em `usuarios` chama a Edge Function
-- `asaas-sync-cliente` (via pg_net, assíncrono — não trava o UPDATE) sempre
-- que nome/e-mail/WhatsApp/CPF mudam, venha a mudança do app, do admin ou
-- do SQL Editor. A função cria o cliente (ou o atualiza, PUT) e grava o
-- resultado de volta aqui.
--
-- Configuração (uma vez, no SQL Editor — ver README):
--   select vault.create_secret('https://<projeto>.supabase.co/functions/v1/asaas-sync-cliente', 'asaas_sync_url');
--   select vault.create_secret('<segredo-aleatorio>', 'asaas_sync_secret');
-- Sem esses segredos o trigger simplesmente não faz nada (o app segue
-- funcionando normalmente).
-- ============================================================

create extension if not exists pg_net;

alter table public.usuarios
  add column if not exists cpf text,
  add column if not exists asaas_customer_id text,
  add column if not exists asaas_sincronizado_em timestamptz,
  add column if not exists asaas_sync_erro text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'usuarios_cpf_formato') then
    -- Só dígitos (11): a formatação fica na tela.
    alter table public.usuarios add constraint usuarios_cpf_formato check (cpf is null or cpf ~ '^[0-9]{11}$');
  end if;
end $$;

create unique index if not exists usuarios_cpf_unico on public.usuarios(cpf) where cpf is not null;
create unique index if not exists usuarios_asaas_customer_id_unico on public.usuarios(asaas_customer_id) where asaas_customer_id is not null;


-- ---- Colunas do Asaas: só o servidor escreve ----
-- A policy "usuarios: atualização própria" deixa o aluno atualizar a
-- própria linha inteira; sem isso ele poderia trocar o asaas_customer_id
-- (e cair na cobrança de outra pessoa).
create or replace function public.protege_colunas_asaas()
returns trigger
language plpgsql
as $$
declare
  papel text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if papel not in ('anon', 'authenticated') then
    return new; -- service_role (Edge Functions) ou SQL Editor
  end if;
  if tg_op = 'INSERT' then
    new.asaas_customer_id := null;
    new.asaas_sincronizado_em := null;
    new.asaas_sync_erro := null;
  elsif new.asaas_customer_id is distinct from old.asaas_customer_id
     or new.asaas_sincronizado_em is distinct from old.asaas_sincronizado_em
     or new.asaas_sync_erro is distinct from old.asaas_sync_erro then
    raise exception 'Campos do Asaas só podem ser alterados pelo servidor.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_usuarios_protege_asaas on public.usuarios;
create trigger trg_usuarios_protege_asaas
  before insert or update on public.usuarios
  for each row execute function public.protege_colunas_asaas();


-- ---- Disparo da sincronização ----
-- security definer: precisa ler o vault. Nunca expõe os segredos — só
-- os usa no cabeçalho da chamada à Edge Function.
create or replace function public.asaas_enfileirar_sync(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_segredo text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'asaas_sync_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'asaas_sync_secret';
  if v_url is null or v_segredo is null then
    return; -- integração ainda não configurada
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-sync-secret', v_segredo),
    body := jsonb_build_object('usuario_id', p_usuario_id)
  );
end;
$$;

-- Só o servidor/admin dispara manualmente (ex.: reprocessar quem deu erro).
revoke execute on function public.asaas_enfileirar_sync(uuid) from public, anon, authenticated;

create or replace function public.trg_usuarios_sync_asaas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sem CPF e sem cliente ainda não há o que criar/atualizar no Asaas.
  if new.cpf is null and new.asaas_customer_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.nome is not distinct from old.nome
     and new.email is not distinct from old.email
     and new.whatsapp is not distinct from old.whatsapp
     and new.cpf is not distinct from old.cpf then
    return new;
  end if;
  perform public.asaas_enfileirar_sync(new.id);
  return new;
end;
$$;

drop trigger if exists trg_usuarios_sync_asaas on public.usuarios;
create trigger trg_usuarios_sync_asaas
  after insert or update of nome, email, whatsapp, cpf on public.usuarios
  for each row execute function public.trg_usuarios_sync_asaas();
