---
description: Revisa em lote os comentários das questões do Foco usando o Supabase conectado (MCP), com até 20 revisores em paralelo
argument-hint: "[quantidade] [disciplina] [banca]"
---

Você vai coordenar a revisão em lote dos comentários de questões do app Foco, usando o Supabase conectado (MCP, ferramenta execute_sql). Guia: docs/REVISAO-CLAUDE-CODE.md.

Argumentos recebidos: $ARGUMENTS

## 0. Conferir a conexão
Se a ferramenta execute_sql do Supabase não estiver disponível, pare e diga ao usuário, em português simples:
"Digite /mcp, escolha **supabase**, clique em autenticar e entre com sua conta do Supabase no navegador. Depois digite /revisar-questoes de novo."

## 1. Combinar a rodada
- Rode `select * from public.cowork_resumo_pendentes();` e mostre uma tabela simples (disciplina, banca, pendentes, puladas) e o total.
- Rode também `select count(*) as embutidas from public.questoes q where not coalesce(q.revisado, false) and coalesce(q.comentario_html, '') ~* '<img[^>]*src=.?data:';`
  Atenção: a coluna "com_imagem" conta QUALQUER imagem (a maioria é link, que este modo revisa normalmente). Só as "embutidas" ficam de fora deste modo. Diga isso ao usuário com esses números (ex.: "X pendentes; só Y têm imagem embutida e ficam para o modo scripts").
- Se os argumentos já disserem quantidade, disciplina e banca, use-os. Senão, pergunte numa mensagem só: qual disciplina (ou "todas"), qual banca (ou "todas") e quantas questões nesta rodada (sugira 100). Espere a resposta.

## 2. Revisar em ciclos de até 100 (20 revisores juntos)
Repita até completar a quantidade combinada (ou até acabar):

1. Pegue os IDs do ciclo (N = o que falta, no máximo 100; troque DISCIPLINA/BANCA pelo nome exato da tabela, ou use null para "todas"). Questões com imagem embutida ficam de fora (elas são feitas pelo modo scripts):
   ```sql
   select q.id
   from public.questoes q
   where not coalesce(q.revisado, false)
     and not coalesce(q.anulada, false)
     and not coalesce(q.desatualizada, false)
     and coalesce(nullif(q.comentario_html, ''), q.comentario, '') <> ''
     and not exists (select 1 from public.cowork_puladas p where p.questao_id = q.id)
     and coalesce(q.comentario_html, '') !~* '<img[^>]*src=.?data:'
     and ('DISCIPLINA' is null or q.disciplina::text ilike 'DISCIPLINA')
     and ('BANCA' is null or q.banca::text ilike 'BANCA')
   order by q.ano desc nulls last, q.id
   limit N;
   ```
   (para "todas", escreva null sem aspas no lugar de 'DISCIPLINA' / 'BANCA').
   Se não vier nenhum ID, a rodada acabou.
2. Divida os IDs em grupos de 5 e dispare os subagentes `revisor-questoes-mcp` EM PARALELO: **até 20 de uma vez, todos na mesma mensagem**, passando a cada um a lista de IDs do seu grupo. Espere todos terminarem antes do próximo ciclo.
3. **Só no primeiro ciclo:** dispare primeiro UM subagente com 2 IDs, mostre os exemplos que ele devolver (original → revisado) e pergunte se pode continuar. Só siga com a aprovação. Nos ciclos seguintes, não pare.
4. Some quantas foram salvas e puladas.

## Regras
- Você (coordenador) só roda os SELECTs acima (resumo, contagem de embutidas e IDs do ciclo). Quem busca, salva e pula são os subagentes.
- Nunca rode comandos que alterem o banco além das funções cowork_* usadas pelos subagentes.
- Não faça commit de nada desta tarefa.

## 3. Relatório final
- Quantas questões foram salvas e quantas puladas nesta rodada.
- Tabela das puladas: ID e motivo.
- Rode de novo `select * from public.cowork_resumo_pendentes();` e mostre quanto ainda falta.
- Se houver questões com imagem embutida pendentes, avise que elas ficam para o modo scripts (/revisar-questoes-scripts).
