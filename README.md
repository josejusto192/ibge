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

## Integração com o Asaas (clientes)

Migration `020_asaas_clientes.sql` + Edge Function `asaas-sync-cliente`.
Cada usuário com CPF vira um cliente no Asaas; o id (`cus_…`) fica em
`usuarios.asaas_customer_id`. Qualquer mudança em nome, e-mail, WhatsApp ou
CPF é enviada ao Asaas automaticamente (trigger no banco → pg_net → Edge
Function). O Asaas exige CPF para criar o cliente, então quem ainda não
tem CPF só é criado lá quando informar.

Configuração (uma vez):

```bash
# 1. Secrets da Edge Function
supabase secrets set ASAAS_API_KEY='$aact_...' \
  ASAAS_BASE_URL='https://api-sandbox.asaas.com/v3' \
  ASAAS_SYNC_SECRET='<um-segredo-aleatorio-longo>'
# produção: ASAAS_BASE_URL='https://api.asaas.com/v3'

# 2. Deploy — sem JWT: quem chama é o banco, autenticado pelo x-sync-secret
supabase functions deploy asaas-sync-cliente --no-verify-jwt
```

```sql
-- 3. No SQL Editor: onde o trigger deve chamar, e o MESMO segredo do passo 1
select vault.create_secret('https://<projeto>.supabase.co/functions/v1/asaas-sync-cliente', 'asaas_sync_url');
select vault.create_secret('<um-segredo-aleatorio-longo>', 'asaas_sync_secret');
```

Sem os segredos do passo 3 o trigger não faz nada (o app segue normal).
Falhas ficam em `usuarios.asaas_sync_erro` e em "Saúde do app". Para
reenviar um usuário manualmente: `select asaas_enfileirar_sync('<uuid>');`.

## Integração com o Asaas (assinaturas)

Migration `021_asaas_assinaturas.sql` + Edge Functions `asaas-assinar` e
`asaas-webhook` (e o módulo `_shared/asaas.ts`, usado também pelo
`asaas-sync-cliente`).

- **Planos**: tabela `planos` (nome, valor, ciclo `MONTHLY`/`YEARLY`/…).
- **Assinar**: o app chama `asaas-assinar` com `plano_id` + CPF (o CPF só é
  pedido aqui). A função cria o cliente e a assinatura no Asaas (forma de
  pagamento escolhida pelo aluno na fatura: Pix, boleto ou cartão) e
  devolve o `invoice_url` da 1ª cobrança.
- **Acesso**: só os webhooks liberam. `usuarios.acesso_ate` = vencimento
  da última cobrança paga + 1 ciclo + 3 dias; `assinatura_ativa` =
  cortesia OU `acesso_ate` no futuro, calculado pelo banco (o navegador não
  consegue alterar). Estorno/chargeback recalculam e cortam o acesso. Um
  job pg_cron de hora em hora desliga quem venceu.
- **Cortesia**: o admin dá/tira em "Alunos e equipe". A migration deu
  cortesia a todo mundo que já tinha acesso — para cortar todos:
  `update usuarios set assinatura_cortesia = false;`

Configuração (uma vez):

```bash
# 1. Token do webhook (NÃO use a API key) — mesmo valor no passo 3
supabase secrets set ASAAS_WEBHOOK_TOKEN='<token-aleatorio-com-mais-de-32-caracteres>'

# 2. Deploy
supabase functions deploy asaas-assinar
supabase functions deploy asaas-webhook --no-verify-jwt
supabase functions deploy asaas-sync-cliente --no-verify-jwt   # usa o módulo compartilhado
```

3. No Asaas (Integrações → Webhooks), crie um webhook:
   - URL: `https://<projeto>.supabase.co/functions/v1/asaas-webhook`
   - Token de autenticação: o mesmo `ASAAS_WEBHOOK_TOKEN`
   - Tipo de envio: **sequencial**
   - Eventos: todos de **cobranças** (`PAYMENT_*`) e de **assinaturas**
     (`SUBSCRIPTION_*`)

Redirecionamento após o pagamento (opcional, recomendado): cadastre o
domínio do app em Asaas → Configurações da conta → Informações (site) e
crie a secret `APP_URL` (ex.: `https://app.seudominio.com.br`, sem barra
no fim). A fatura passa a devolver o aluno para `/assinar?pagamento=ok`
depois de pagar com Pix/cartão. Vale para assinaturas criadas depois disso.

4. Cadastre um plano (SQL Editor):

```sql
insert into planos (nome, descricao, valor, ciclo) values ('Foco Mensal', 'Acesso completo', 29.90, 'MONTHLY');
```

**Bloqueio (migration `022_bloqueio_por_assinatura.sql`)**: sem assinatura,
só o 1º módulo de questões de cada trilha é liberado. O banco barra o resto
(`get_modulo_questoes` devolve `ASSINATURA_NECESSARIA`) e o caderno de erros
só mostra questões de módulos liberados. No app, os módulos pagos aparecem
com cadeado e levam para `/assinar` (escolha do plano + CPF → fatura).

Eventos recebidos ficam em `asaas_webhook_eventos` (status `PROCESSADO` /
`ERRO`). Erros também aparecem em "Saúde do app". Para reprocessar um
evento: `select asaas_processar_evento(<id>);`.

## Revisão espaçada e Trilha Inteligente (migration 028)

**Revisão espaçada (todas as trilhas).** Toda resposta passa por `responder_questao` e fica no histórico (`respostas`). Errou → a questão vai para o caderno na hora (`revisoes`, etapa 0). Acertou a revisão → volta em 1 dia, depois 7, depois 30, e então fica dominada. O caderno mostra erros + revisões vencidas de todas as trilhas. Nos módulos manuais, 1–2 questões antigas (revisões vencidas ou acertadas há 3+ dias) entram no meio da sessão com o selo "Revisão".

**Algoritmo (cálculo, sem IA).** A cada resposta o banco atualiza a nota do aluno por disciplina e assunto (`proficiencia`) e a dificuldade da questão (`questao_stats`), num modelo tipo Elo com chance de chute (1/nº de alternativas; Certo/Errado = 50%). Domínio exibido = chance de acertar uma questão média. A tela Evolução mostra o domínio por assunto.

**Trilha inteligente (admin → Trilhas → Nova trilha → Inteligente) — formato Duolingo (migration 030).** Para o aluno é um caminho de **seções → unidades → bolinhas**: cada unidade tem N lições e, no fim, uma bolinha de **revisão da unidade**. Terminou a lição, a próxima libera — sem meta nem nota mínima na tela. O admin define:
- concurso/cargo, filtros do banco (bancas, órgãos, cargos, escolaridade, anos, só Certo/Errado);
- banca-alvo e % de prioridade; questões por lição e revisões por lição;
- seções (criar, renomear, reordenar, excluir) e unidades (disciplina + assuntos, seção e nº de lições, com sugestão pelo estoque);
- **"Sugerir estrutura"**: olha o banco com os filtros salvos e propõe uma seção por disciplina e uma unidade por assunto (assuntos pequenos são agrupados), com as lições calculadas — marque e crie tudo de uma vez;
- questões obrigatórias (por unidade) e excluídas; "Simular uma lição" mostra o que o algoritmo montaria.

Cada lição (`montar_sessao_inteligente`) traz revisões vencidas, obrigatórias, 1 reforço da unidade anterior mais fraca e questões novas perto do nível do aluno (~70% de chance de acerto), priorizando a banca-alvo. A revisão da unidade (`p_revisao = true`) traz os erros e o que foi visto há mais tempo. `concluir_licao` avança a unidade (o servidor confere se o aluno respondeu). Só questões revisadas, não anuladas e não desatualizadas entram. A 1ª unidade do caminho (na ordem das seções) é grátis.

**Ordem de publicação:** rode as migrations 028, 029 e 030 no Supabase **antes** de promover a versão do app no Vercel.

## Onboarding, público e nível inicial (migration 031)

- **Nível inicial:** a resposta "Como está seu preparo hoje?" vira o ponto de partida do algoritmo (começando do zero → questões mais fáceis; reta final → mais difíceis). Depois das primeiras respostas o algoritmo corrige sozinho.
- **Funil do cadastro:** cada tela do onboarding vista é registrada (`onboarding_eventos`, sem login) para saber onde as pessoas desistem.
- **Admin → Público:** faixa etária, concurso, nível, prazo da prova, se já prestou, meta escolhida × estudo real e o funil do cadastro, com filtro de período.
- **Plano real:** a tela "Seu plano está pronto" usa o tamanho real da trilha (`plano_onboarding`) para calcular as semanas no ritmo escolhido.
- Se o projeto exigir confirmação de e-mail, as respostas do onboarding ficam guardadas na conta e o perfil é criado no 1º login.

**Ordem de publicação:** rode a migration 031 no Supabase **antes** de promover a versão do app no Vercel.

## Origem dos cadastros (UTM) e ficha do aluno (migration 032)

- **UTMs:** ao chegar no app por um link como `https://SEU-DOMINIO/?utm_source=instagram&utm_medium=social&utm_campaign=lancamento&utm_content=reels1`, a origem fica guardada no aparelho (30 dias) e vai para o perfil no cadastro. Vale o último link com UTM; acessos diretos não apagam. Cliques de anúncio sem UTM (`gclid`, `fbclid`, `ttclid`) e o site de origem também são registrados. O código de indicação (`?ref=`) é preservado junto.
- **Admin → Público:** tabela "De onde vêm os cadastros" (visitas, cadastros, conversão e assinantes por fonte e campanha).
- **Admin → Alunos e equipe:** toque numa pessoa para abrir a ficha (contato, respostas do cadastro, origem, estudo dos últimos 14 dias, desempenho por disciplina, assinatura e indicações). A busca também encontra por WhatsApp e campanha.

**Ordem de publicação:** rode a migration 032 no Supabase **antes** de promover a versão do app no Vercel.

## Revisão de comentários em lote

- **Claude Code (mais rápido):** `/revisar-questoes` (Supabase conectado, sem chaves) ou `/revisar-questoes-scripts`. Veja `docs/REVISAO-CLAUDE-CODE.md` (migration 037).
- **Claude Cowork com o Supabase conectado:** veja `docs/REVISAO-COWORK.md` (migrations 033 a 036).

### ⚠️ Checklist antes do lançamento
- [ ] Remover a opção **"Usar também questões ainda não revisadas"** da trilha inteligente (temporária, migration 029): nova migration apagando `trilha_config.permitir_nao_revisadas` e voltando `questoes_filtradas`/`questoes_da_etapa`/`admin_contar_estoque` à versão da 028; no app, procurar `permitir_nao_revisadas`.
