# Foco — App de questões para concursos (IBGE)

App mobile-first, gamificado, de trilhas de estudo por concurso (modelo
Duolingo). React + TypeScript + Vite + Tailwind, com Supabase real
(Auth + Postgres) — sem dados mockados.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_ANON_KEY com a chave anon do projeto
npm run dev                  # http://localhost:5173, redireciona para /onboarding
npm run build                # type-check + build de produção
```

## ⚠️ Antes de fazer deploy desta versão

Este app espera colunas/tabelas novas que **não existem ainda** no banco em
produção. Rode a migration abaixo no **SQL Editor do Supabase** antes (ou
junto) do deploy, ou a tela de onboarding/trilha vai quebrar em runtime:

```
supabase/migrations/003_foco_app_gamificacao.sql
```

Ela é idempotente (usa `if not exists` / `add column if not exists`) — pode
rodar mais de uma vez sem problema. O que ela adiciona:

- Colunas novas em `usuarios`: `whatsapp`, `faixa_etaria`,
  `ja_prestou_concurso`, `nivel_preparo`, `prazo_prova`, `meta_diaria`, `xp`,
  `trilha_ativa_id`.
- Tabela `progresso_modulos` (progresso por disciplina dentro de uma trilha).
- Tabela `indicacoes` (programa de indicação).
- Duas funções `security definer`: `get_ranking()` (ranking mensal, expõe só
  nome/xp/streak) e `resolve_referral_code()` (resolve um código de indicação
  para o id do indicador).

As migrations `001_mvp_schema.sql` e `002_questoes_rls.sql` já eram
existentes neste repo e continuam válidas.

## O que é real vs. o que ainda é mockado

**Real (Supabase):**
- Auth (cadastro com e-mail/senha no fim do onboarding, login).
- Perfil, XP, streak, meta diária (`usuarios`).
- Trilhas e disciplinas (`trilhas`, `trilha_disciplinas`).
- Questões (`questoes` — tabela que o cliente já tinha).
- Respostas e progresso por módulo (`progresso_questoes`, `progresso_modulos`).
- Ranking mensal (`get_ranking()`).
- Indicações/referral (`indicacoes`).
- Conquistas: catálogo é código estático (`src/data/mock.ts`), mas o critério
  de cada uma é avaliado com dados reais do usuário.

**Ainda mockado (documentado inline com comentários `PRODUCTION TODO`):**
- **Tutor de IA** (`src/screens/question/AiTutorSheet.tsx`) — resposta
  simulada com atraso falso. Precisa de um endpoint de backend que chame a
  API da Anthropic (Claude) do lado do servidor — nunca do cliente.
- **Crédito de indicação** — a linha em `indicacoes` é criada de verdade
  quando alguém se cadastra com um código, mas aplicar o crédito de R$30 na
  assinatura do indicador requer um webhook do provedor de pagamento (ainda
  não existe integração de cobrança).

## Estrutura

- `src/lib/supabase.ts`, `database.types.ts`, `queries.ts` — cliente
  Supabase, tipos do banco e todas as queries/mutations reais.
- `src/contexts/AuthContext.tsx` — sessão/usuário do Supabase Auth.
- `src/contexts/AppDataContext.tsx` — perfil, trilha ativa, módulos e meta
  diária carregados do banco (substitui o que antes era estado mockado).
- `src/state/` — estado efêmero de UI/sessão (onboarding em andamento, sessão
  de questão em progresso, filtros, timer, sheets).
- `src/screens/` — uma tela por rota (`/onboarding`, `/login`, `/trilha`,
  `/questao`, `/resultado`, `/stats`, `/ranking`, `/perfil`).
- `supabase/migrations/` — todas as migrations, em ordem.
