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
produção. Rode as migrations abaixo, **nesta ordem**, no **SQL Editor do
Supabase**, antes (ou junto) do deploy:

```
supabase/migrations/003_foco_app_gamificacao.sql
supabase/migrations/004_trilhas_curadas_por_admin.sql
supabase/migrations/005_revisao_comentarios_ia.sql
```

Todas são idempotentes (`if not exists` / `drop policy if exists` etc.) —
podem rodar mais de uma vez sem problema.

**003** adiciona: colunas novas em `usuarios` (`whatsapp`, `faixa_etaria`,
`ja_prestou_concurso`, `nivel_preparo`, `prazo_prova`, `meta_diaria`, `xp`,
`trilha_ativa_id`), tabela `progresso_modulos`, tabela `indicacoes`, e as
funções `get_ranking()` / `resolve_referral_code()`.

**004** muda o modelo de trilhas: agora a trilha **não** é derivada
automaticamente de `trilha_disciplinas` — um admin monta cada trilha
manualmente, escolhendo questão por questão. Ela adiciona `usuarios.is_admin`,
a função `is_admin()`, as tabelas `modulos` (nó do caminho, título livre) e
`modulo_questoes` (curadoria: quais questões e em que ordem compõem cada
módulo), reescreve as policies de `trilhas`/`progresso_modulos`, e — **importante** —
fecha a leitura/escrita da tabela `questoes` para admin-only (antes havia uma
falha de RLS permitindo leitura/escrita anônima). O aluno passa a acessar
questões só via `get_modulo_questoes()` e as próprias estatísticas via
`get_meu_desempenho_por_disciplina()`.

**005** adiciona o fluxo de revisão de comentários: colunas
`comentario_revisado`, `comentario_revisado_html`, `revisado`, `revisado_em`,
`revisado_metodo`, `revisado_por` em `questoes`; um trigger que impede
adicionar a um módulo qualquer questão com `revisado = false`; a tabela
`configuracoes_ia` (config do Gemini: modelo, api key, prompt extra); e
redefine `get_modulo_questoes()` para sempre entregar ao aluno o comentário
**revisado** (nunca o original raspado de terceiros).

Depois de rodar as três, marque sua própria conta como admin (troque o
e-mail):

```sql
update usuarios set is_admin = true where email = 'seu-email@exemplo.com';
```

### Deploy da Edge Function de revisão com IA

A função `supabase/functions/revisar-comentario` roda no servidor (nunca no
navegador do aluno) e chama a API do Gemini usando a `api_key` guardada em
`configuracoes_ia`. Faça o deploy dela com a Supabase CLI:

```bash
supabase functions deploy revisar-comentario
```

Depois, acesse `/admin/configuracoes` logado como admin e configure o modelo
Gemini e a API key (gerada em https://aistudio.google.com/apikey) — sem isso,
o botão "Revisar com IA" no admin não funciona (a revisão manual continua
funcionando normalmente, sem depender da IA).

As migrations `001_mvp_schema.sql` e `002_questoes_rls.sql` já eram
existentes neste repo e continuam válidas.

## O que é real vs. o que ainda é mockado

**Real (Supabase):**
- Auth (cadastro com e-mail/senha no fim do onboarding, login).
- Perfil, XP, streak, meta diária (`usuarios`).
- Trilhas curadas manualmente pelo admin (`trilhas`, `modulos`,
  `modulo_questoes`) — veja `/admin`.
- Banco de questões (`questoes`) — admin-only; o aluno só vê o que o admin
  incluiu em algum módulo, e só depois de revisado.
- Revisão de comentário por IA (Gemini) ou manual, com preservação de imagens
  originais (`comentario_revisado`, `comentario_revisado_html`, `revisado*`).
- Respostas e progresso por módulo (`progresso_questoes`, `progresso_modulos`).
- Ranking mensal (`get_ranking()`).
- Indicações/referral (`indicacoes`).
- Conquistas: catálogo é código estático (`src/data/mock.ts`), mas o critério
  de cada uma é avaliado com dados reais do usuário.

**Ainda mockado (documentado inline com comentários `PRODUCTION TODO`):**
- **Tutor de IA do aluno** (`src/screens/question/AiTutorSheet.tsx`) —
  resposta simulada com atraso falso. Precisa de um endpoint de backend que
  chame a API da Anthropic (Claude) do lado do servidor — nunca do cliente.
  (Diferente da revisão de comentário do admin, que já usa Gemini de verdade.)
- **Crédito de indicação** — a linha em `indicacoes` é criada de verdade
  quando alguém se cadastra com um código, mas aplicar o crédito de R$30 na
  assinatura do indicador requer um webhook do provedor de pagamento (ainda
  não existe integração de cobrança).

## Painel admin (`/admin`)

Acesso restrito a contas com `usuarios.is_admin = true` (ver acima).

- `/admin/trilhas` — criar/editar/excluir trilhas.
- `/admin/trilhas/:id` — editar uma trilha e seus módulos (criar, reordenar,
  excluir módulo).
- `/admin/modulos/:moduloId` — montar um módulo: buscar questões no banco
  (texto/disciplina/banca/revisadas ou não), adicionar/remover/reordenar as
  que compõem o módulo. Só é possível adicionar questão já `revisado = true`.
- `/admin/questoes` — navegar o banco de questões inteiro (mesma busca), fora
  do contexto de um módulo específico.
- `/admin/questoes/:id` — revisar uma questão: ver enunciado/alternativas,
  comentário original (não é exibido ao aluno), reescrever manualmente ou
  clicar em "Revisar com IA" (chama a Edge Function `revisar-comentario`),
  inserir imagens, e marcar como revisado.
- `/admin/configuracoes` — configurar o Gemini (modelo, API key, prompt
  extra opcional) usado na revisão por IA.

## Estrutura

- `src/lib/supabase.ts`, `database.types.ts`, `queries.ts` — cliente
  Supabase, tipos do banco e queries/mutations do app do aluno.
- `src/lib/adminQueries.ts` — queries/mutations do painel admin (CRUD de
  trilhas/módulos/curadoria, busca de questões, revisão de comentário,
  configurações de IA).
- `src/lib/sanitizeHtml.ts` — sanitização (DOMPurify) do HTML de
  enunciado/comentário antes de renderizar com `dangerouslySetInnerHTML`.
- `src/admin/` — todas as telas do painel admin (ver seção acima) e o guard
  de acesso (`AdminGuard.tsx`).
- `src/contexts/AuthContext.tsx` — sessão/usuário do Supabase Auth.
- `src/contexts/AppDataContext.tsx` — perfil, trilha ativa, módulos e meta
  diária carregados do banco (substitui o que antes era estado mockado).
- `src/state/` — estado efêmero de UI/sessão (onboarding em andamento, sessão
  de questão em progresso, timer, sheets).
- `src/screens/` — uma tela por rota do app do aluno (`/onboarding`,
  `/login`, `/trilha`, `/questao`, `/resultado`, `/stats`, `/ranking`,
  `/perfil`).
- `supabase/migrations/` — todas as migrations, em ordem.
- `supabase/functions/revisar-comentario/` — Edge Function que chama o
  Gemini para reescrever o comentário de uma questão, preservando as imagens
  originais.
