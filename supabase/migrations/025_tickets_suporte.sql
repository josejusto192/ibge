-- ============================================================
-- Tickets: "Reportar questão" + Suporte, atendidos pelo admin
-- ============================================================
-- Até aqui o "Reportar ou comentar questão" só mostrava um aviso na tela e
-- não salvava nada. Agora tudo vira ticket:
--   tipo 'questao' → aberto pela tela da questão (questao_id + motivo)
--   tipo 'suporte' → aberto pelo perfil (categoria + mensagem)
-- O admin muda o status e pode responder; o aluno vê status e resposta em
-- "Meus chamados".
--
-- Acesso:
--   aluno  → cria e lê só os próprios (nunca muda status/resposta)
--   editor → lê/atende só tickets de questão (conteúdo)
--   admin  → tudo (suporte pode envolver pagamento e dados pessoais)
-- ============================================================

create table if not exists public.tickets (
  id            bigserial primary key,
  usuario_id    uuid references public.usuarios(id) on delete set null,
  tipo          text not null check (tipo in ('questao', 'suporte')),
  questao_id    uuid references public.questoes(id) on delete set null,
  motivo        text not null,                 -- motivo do reporte ou categoria do suporte
  mensagem      text check (char_length(mensagem) <= 4000),
  status        text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  resposta      text check (char_length(resposta) <= 4000),
  atendido_por  uuid references public.usuarios(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  resolvido_em  timestamptz
);

create index if not exists tickets_status_idx on public.tickets(status, criado_em desc);
create index if not exists tickets_usuario_idx on public.tickets(usuario_id, criado_em desc);

alter table public.tickets enable row level security;

drop policy if exists "tickets: aluno cria os próprios" on public.tickets;
create policy "tickets: aluno cria os próprios"
  on public.tickets for insert
  to authenticated
  with check (auth.uid() = usuario_id);

drop policy if exists "tickets: leitura" on public.tickets;
create policy "tickets: leitura"
  on public.tickets for select
  using (auth.uid() = usuario_id or is_admin() or (tipo = 'questao' and is_conteudo_admin()));

drop policy if exists "tickets: atendimento" on public.tickets;
create policy "tickets: atendimento"
  on public.tickets for update
  using (is_admin() or (tipo = 'questao' and is_conteudo_admin()))
  with check (is_admin() or (tipo = 'questao' and is_conteudo_admin()));


-- ---- Regras de gravação ----
-- Aluno: ticket sempre nasce "aberto", sem resposta, e com limite diário
-- (anti-spam). Equipe: atualizado_em/resolvido_em/atendido_por automáticos;
-- o conteúdo enviado pelo aluno não é alterado no atendimento.
create or replace function public.tickets_regras()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'aberto';
    new.resposta := null;
    new.atendido_por := null;
    new.resolvido_em := null;
    new.criado_em := now();
    new.atualizado_em := now();
    if new.tipo = 'suporte' then
      new.questao_id := null;
    end if;
    if (select count(*) from public.tickets
        where usuario_id = new.usuario_id and criado_em > now() - interval '1 day') >= 20 then
      raise exception 'Você abriu muitos chamados hoje. Tente de novo amanhã.';
    end if;
    return new;
  end if;

  new.usuario_id := old.usuario_id;
  new.tipo := old.tipo;
  new.questao_id := old.questao_id;
  new.motivo := old.motivo;
  new.mensagem := old.mensagem;
  new.criado_em := old.criado_em;
  new.atualizado_em := now();
  if new.status is distinct from old.status or new.resposta is distinct from old.resposta then
    new.atendido_por := coalesce(auth.uid(), old.atendido_por);
  end if;
  if new.status in ('resolvido', 'fechado') and old.status not in ('resolvido', 'fechado') then
    new.resolvido_em := now();
  elsif new.status in ('aberto', 'em_andamento') then
    new.resolvido_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tickets_regras on public.tickets;
create trigger trg_tickets_regras
  before insert or update on public.tickets
  for each row execute function public.tickets_regras();
