# Revisão de comentários com o Claude Code

Há dois modos:

- **`/revisar-questoes` (recomendado, mais fácil):** usa o Supabase conectado ao Claude Code (MCP). Não precisa de chave nem de senha: você entra no Supabase pelo navegador uma vez. Até 20 revisores trabalham em paralelo (ciclos de 100 questões) e salvam direto no banco, com as mesmas travas. As questões com **imagem embutida** (poucas) ficam para o modo scripts.
- **`/revisar-questoes-scripts`:** usa os scripts e o login de admin (o `.env` criado por `node scripts/revisao/configurar.mjs`). Faz também as questões com imagem embutida.

## Modo fácil: /revisar-questoes (MCP)

No terminal (PowerShell), dentro da pasta do projeto:

1. `git checkout main` e `git pull`, para ter a versão mais nova.
2. Se ainda não tiver o Claude Code no terminal: `npm install -g @anthropic-ai/claude-code`.
3. `claude`, para abrir o Claude Code no terminal.
4. Se ele perguntar se confia na pasta ou no servidor "supabase" deste projeto, confirme.
5. Digite `/mcp` → escolha **supabase** → **Authenticate**. O navegador abre: entre com a sua conta do Supabase e autorize. Isso é feito uma vez só.
6. Digite `/revisar-questoes`. Ele mostra o que falta, pergunta a disciplina, a banca e a quantidade, mostra 2 exemplos para você aprovar e depois segue sozinho.

O arquivo `.mcp.json` já aponta para o projeto do Foco, só com as ferramentas de banco de dados. As permissões em `.claude/settings.json` deixam ele rodar SQL sem pedir confirmação a cada passo. As regras do revisor (`.claude/agents/revisor-questoes-mcp.md`) proíbem alterar qualquer coisa além das funções de revisão.

---

## Modo scripts: /revisar-questoes-scripts

É o jeito mais rápido de revisar muitas questões. O Claude Code baixa um lote (até 50 por ciclo), revisa **várias questões em paralelo** com o revisor `revisor-questoes` e envia de volta. O banco confere cada revisão antes de gravar, com as mesmas travas do Cowork: imagens, tamanho mínimo, HTML seguro e nunca sobrescrever questão já revisada.

As questões aparecem no painel como **"Revisada (cowork)"**, com o seu usuário como revisor.

## Como funciona

1. `scripts/revisao/baixar.mjs` baixa o ciclo para `revisao-trabalho/lote/`. Cada questão ganha uma pasta com:
   - `questao.md`: enunciado, alternativas, gabarito, diretrizes e comentário original;
   - as imagens salvas como arquivos (`IMG1.png`… do comentário e `enunciado-img1.png`…), para o Claude olhar.
2. Os revisores escrevem `revisado.html` (ou `pular.txt` com o motivo) em cada pasta, vários ao mesmo tempo.
3. `scripts/revisao/enviar.mjs` envia tudo:
   - o que o banco aceitou vai para `revisao-trabalho/feitas/`;
   - o que ele recusou fica no lote com `erro.txt` explicando o motivo, e o Claude corrige.

A pasta `revisao-trabalho/` fica só no seu computador (fora do git). Ela serve de histórico do que foi feito.

## Preparar (uma vez, só no terminal)

1. **Banco:** a migration `037_revisao_por_script_com_login_admin.sql` precisa estar aplicada (além da 033 a 036). Já está.
2. No VS Code, abra o projeto e o terminal (menu **Terminal → Novo Terminal**). Rode, um de cada vez:
   ```
   git pull
   npm install
   node scripts/revisao/configurar.mjs
   ```
3. O último comando **pergunta tudo e cria o arquivo sozinho**:
   - o endereço do Supabase: Supabase → Project Settings → API → *Project URL*;
   - a chave **pública** "anon", na mesma tela. É a mesma `VITE_SUPABASE_ANON_KEY` do Vercel. **Não use a "service_role"**: se colar essa, o assistente recusa;
   - o seu e-mail e a sua senha de admin do app. A senha não aparece enquanto você digita.

   No fim ele testa o login e diz quantas questões faltam. O arquivo criado (`scripts/revisao/.env`) não vai para o GitHub.

Para trocar algum dado depois, rode `node scripts/revisao/configurar.mjs` de novo e aperte Enter no que quiser manter.

## Usar

No Claude Code (dentro do VS Code), digite:

```
/revisar-questoes-scripts
```

Ele mostra o que falta, pergunta a disciplina, a banca e a quantidade, e começa. Também dá para passar direto:

```
/revisar-questoes-scripts 200 Matemática FGV
```

- No **primeiro ciclo** ele para, mostra 2 exemplos e pede a sua aprovação antes de enviar. Depois segue sozinho, de 50 em 50.
- No fim, mostra quantas foram salvas, a lista das puladas com o motivo e quanto ainda falta.

### Mais rápido ainda
- Cada ciclo usa até 10 revisores em paralelo, com 5 questões cada. Rodadas grandes (200, 500) funcionam, mas consomem mais do seu limite de uso do Claude.
- Para usar um modelo mais rápido ou mais barato só nos revisores, adicione o campo `model:` no topo de `.claude/agents/revisor-questoes.md`.
- As permissões de `.claude/settings.json` já liberam os scripts e a pasta `revisao-trabalho/`, então o Claude não fica pedindo confirmação a cada passo.

## Questões puladas

Elas ficam registradas no banco com o motivo e não voltam nos próximos lotes. Para ver a lista, rode no SQL Editor:

`select p.motivo, p.pulada_em, q.id, q.disciplina from cowork_puladas p join questoes q on q.id = p.questao_id order by p.pulada_em desc;`

Depois de corrigir uma no painel, ou para ela voltar à fila: `delete from cowork_puladas where questao_id = '...';`

## Regras de escrita

Estão em `.claude/agents/revisor-questoes.md`, e são as mesmas do Cowork (`docs/REVISAO-COWORK.md`):
- parafrasear sem perder conteúdo;
- conferir o gabarito;
- tirar bibliografia, nomes de professores e sites;
- manter os marcadores `[[IMGn]]` e as fórmulas em `render-latex`;
- pular quando o comentário parece errado ou falta imagem.

Para mudar o estilo das revisões, edite esse arquivo.
