# Handoff — continuar em nova sessão

Contexto para quem (ou qual sessão do Claude Code) continuar este projeto.
Apague este arquivo depois que as pendências abaixo forem resolvidas.

## Onde paramos

O app (React + Vite + TS + Tailwind, Supabase real) está com o código todo
pronto e já commitado/pushado em `main` neste repo
(`josejusto192/ibge`). Build (`npm run build`), type-check (`tsc -p
tsconfig.app.json --noEmit`) e lint (`npx oxlint`) passam limpos.

Commits mais recentes relevantes:
- Painel admin de curadoria de trilhas + revisão de comentário por IA (Gemini)
- Correção de arredondamento dos bottom sheets

## Pendência: rodar migrations 004/005 e publicar a edge function

O código está pronto, mas as migrations **004** e **005** ainda não foram
aplicadas no banco de produção (Supabase), e a edge function
`revisar-comentario` ainda não foi publicada. Sem isso, o painel `/admin`
não funciona (as tabelas/colunas novas não existem no banco ainda).

Projeto Supabase: `lvdbdxoojjirzjrxxchi` (`https://lvdbdxoojjirzjrxxchi.supabase.co`)

Passos, na ordem, documentados em detalhe no `README.md` (seção "⚠️ Antes de
fazer deploy desta versão"):

1. Rodar `supabase/migrations/003_foco_app_gamificacao.sql` (se ainda não
   rodou — provavelmente já rodou antes).
2. Rodar `supabase/migrations/004_trilhas_curadas_por_admin.sql`.
3. Rodar `supabase/migrations/005_revisao_comentarios_ia.sql`.
4. Marcar a conta do usuário como admin: `update usuarios set is_admin =
   true where email = '<email de login do usuário>';`
5. Publicar a edge function: `supabase functions deploy revisar-comentario`
   (precisa da Supabase CLI logada).
6. Configurar o Gemini em `/admin/configuracoes` (modelo + API key) antes de
   usar "Revisar com IA" no painel admin.

## Por que isso não foi feito automaticamente nesta sessão

O usuário forneceu um token de acesso do Supabase (Management API,
`sbp_...`) para que o Claude rodasse as migrations e publicasse a função
diretamente. **Este ambiente (sandbox) tem uma allowlist de rede que bloqueia
`api.supabase.com` e `*.supabase.co`** por padrão, então não foi possível
usar o token daqui. Tentamos mudar a configuração de rede do ambiente já em
execução e deu falha (provável limitação: a política de rede só pode ser
escolhida na criação de um ambiente/sessão novo, não alterada depois).

**Se a nova sessão for criada já com esses domínios liberados** (escolhido
na hora de criar o ambiente), o Claude pode usar o token do usuário para
rodar os passos 2–5 acima diretamente via API do Supabase (`POST
https://api.supabase.com/v1/projects/{ref}/database/query` para SQL, e o
endpoint de deploy de functions para a edge function).

⚠️ O token `sbp_...` foi colado no chat da sessão anterior — **deve ser
rotacionado/revogado** no dashboard do Supabase (Account → Access Tokens)
assim que não for mais necessário, já que ficou exposto no transcript.

## Alternativa (sem token, sem depender de rede liberada)

O usuário pode simplesmente rodar os 3 arquivos SQL manualmente no SQL
Editor do Supabase (idempotentes, pode rodar mais de uma vez) e publicar a
edge function pela CLI no próprio computador — sem precisar de nenhum token
nem de mudar configuração de ambiente nenhuma. Essa é a via mais simples e
não depende de rede liberada nesta sandbox.
