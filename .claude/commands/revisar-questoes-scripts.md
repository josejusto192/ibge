---
description: Revisa em lote os comentários das questões do Foco (baixa, revisa em paralelo e envia)
argument-hint: "[quantidade] [disciplina] [banca]"
---

Você vai coordenar a revisão em lote dos comentários de questões do app Foco. O guia completo está em docs/REVISAO-CLAUDE-CODE.md.

Argumentos recebidos: $ARGUMENTS

## 1. Combinar a rodada
- Rode `node scripts/revisao/resumo.mjs` e mostre a tabela do que falta revisar.
- Se os argumentos acima já disserem quantidade, disciplina e banca, use-os. Senão, pergunte numa mensagem só:
  qual disciplina (ou "todas"), qual banca (ou "todas") e quantas questões nesta rodada (sugira 50).
  Espere a resposta antes de continuar.
- Use o nome da disciplina e da banca exatamente como aparece na tabela.

## 2. Revisar em ciclos de até 50 questões
Repita até completar a quantidade combinada (ou até acabar o que falta):

1. Baixe o ciclo:
   `node scripts/revisao/baixar.mjs --quantidade N --disciplina "DISCIPLINA" --banca "BANCA"`
   (N = o que falta, no máximo 50; omita --disciplina/--banca quando for "todas").
   Se ele avisar que ainda há questões no lote, rode primeiro `node scripts/revisao/enviar.mjs`.
2. Divida as pastas listadas em grupos de 5 e dispare os subagentes `revisor-questoes` EM PARALELO (vários na mesma mensagem, até 10 de uma vez), passando a cada um os caminhos das pastas do seu grupo.
3. Quando todos terminarem, rode `node scripts/revisao/enviar.mjs`.
4. Se alguma pasta foi recusada (ficou no lote com erro.txt), dispare um subagente `revisor-questoes` só para essas pastas (ele corrige ou pula) e rode `node scripts/revisao/enviar.mjs` de novo. Se ainda sobrar recusada, crie você mesmo o `pular.txt` com o motivo do erro.txt e envie.
5. **Só no primeiro ciclo:** antes do passo 3, mostre 2 exemplos (trecho do comentário original → revisado.html) e pergunte se pode enviar e continuar. Só siga com a aprovação. Nos ciclos seguintes, não pare.

## Regras
- Use apenas os scripts de scripts/revisao para falar com o banco. Não use outras ferramentas de banco, não edite migrations nem o código do app.
- Não leia nem mostre o conteúdo de scripts/revisao/.env.
- Não faça commit de nada desta tarefa (revisao-trabalho/ fica fora do git).

## 3. Relatório final
- Quantas questões foram salvas e quantas puladas nesta rodada.
- Tabela das puladas: pasta, disciplina e motivo.
- Rode `node scripts/revisao/resumo.mjs` de novo e mostre quanto ainda falta.
