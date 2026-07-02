-- Permite que usuários autenticados leiam as questões
alter table public.questoes enable row level security;

create policy "questoes: leitura autenticada"
  on public.questoes for select
  to authenticated
  using (true);
