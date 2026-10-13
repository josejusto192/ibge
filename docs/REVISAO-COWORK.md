# Revisão de comentários com o Claude Cowork

O Cowork, ligado direto no Supabase, faz o mesmo que o botão "Revisar com IA" do app faz com o Gemini: reescreve o comentário de cada questão com outras palavras, sem perder conteúdo, e marca a questão como revisada (aparece como **"Revisada (cowork)"** no painel).

Para ser seguro, ele **não mexe direto nas tabelas**. Usa só funções próprias do banco (migrations 033 a 036):

| Função | O que faz |
|---|---|
| `cowork_resumo_pendentes()` | Mostra quantas questões faltam revisar por disciplina e banca (e quantas têm imagem), para o Cowork te perguntar o que revisar. |
| `cowork_proximas_questoes(limite, disciplina, banca)` | Traz o próximo lote de questões **sem revisão** (máx. 50), com enunciado (texto e HTML), alternativas, gabarito, comentário original, **os links de todas as imagens** (enunciado, alternativas e comentário) e as diretrizes extras de Configurações. |
| `cowork_imagem(questao_id, n)` | Devolve a imagem n do comentário (link ou imagem embutida) para o Cowork olhar. |
| `cowork_pular(questao_id, motivo)` | Marca a questão como pulada, com o motivo. Ela não volta nos próximos lotes. |
| `cowork_salvar_revisao(questao_id, html)` | **Confere e salva.** Troca os marcadores [[IMGn]] pelas imagens originais e recusa texto vazio ou curto demais, texto com menos de 40% do original (perda de conteúdo), HTML perigoso e imagens faltando. Não sobrescreve questão já revisada. |

## 1. Preparar (uma vez)

1. No Supabase (SQL Editor), rode, nesta ordem, `033_revisao_via_cowork.sql`, `034_cowork_ve_imagens.sql`, `035_cowork_resumo_pendentes.sql` e `036_cowork_marcadores_e_puladas.sql` (pasta `supabase/migrations`).
2. No Claude Cowork, conecte o **conector do Supabase** (Configurações → Conectores → Supabase), entre com a sua conta e dê acesso **só ao projeto do Foco**.
3. Recomendado: antes da primeira rodada grande, faça um backup em Supabase → Database → Backups, ou teste com um lote pequeno (5 questões) e confira no painel.

## 2. Prompt para colar no Cowork

Cole como está, sem editar nada. O Cowork mostra o que falta revisar e **pergunta** o que você quer antes de começar.

```text
Você vai me ajudar a revisar comentários de questões de concurso do app Foco, no projeto Supabase conectado.

## Passo 1 — Mostrar o que falta e me perguntar (NÃO comece antes da minha resposta)
Rode com a ferramenta de SQL do Supabase:
   select * from public.cowork_resumo_pendentes();
Mostre o resultado numa tabela simples (disciplina, banca, pendentes, com imagem) e o total geral.
Depois me pergunte, numa mensagem só:
1. Qual disciplina revisar (ou "todas")?
2. Qual banca (ou "todas")?
3. Quantas questões nesta rodada? (sugira 20 se eu não souber)
Espere eu responder. Se eu responder só parte, use "todas" para o que faltar e 20 como quantidade.

## Passo 2 — Revisar em lotes de 10
1. Busque o lote (use null para "todas"; o nome da disciplina/banca exatamente como apareceu na tabela):
   select * from public.cowork_proximas_questoes(10, 'DISCIPLINA' ou null, 'BANCA' ou null);
2. Para CADA questão do lote, escreva o novo comentário (regras abaixo) e salve:
   select public.cowork_salvar_revisao('<questao_id>', $html$<p>...novo comentário...</p>$html$);
   Use SEMPRE o delimitador $html$ ... $html$ em volta do HTML (nunca aspas simples).
3. Se a função recusar com um erro, leia a mensagem, corrija o texto e tente de novo UMA vez.
   Se recusar de novo, marque como pulada (veja "Quando NÃO salvar").
4. Repita até completar a quantidade combinada ou até não vir mais nenhuma questão.
   Questões puladas não voltam nos próximos lotes.
5. Depois do PRIMEIRO lote, pare e me mostre 2 exemplos (antes → depois) e pergunte se pode continuar. Só siga se eu aprovar.

## Imagens (gráficos, tabelas, mapas mentais)
- No comentário original, cada imagem aparece como um marcador: [[IMG1]], [[IMG2]]… (a coluna imagens_no_comentario diz quantas são).
- Para VER a imagem n do comentário: select public.cowork_imagem('<questao_id>', n);
  Ela devolve um link (abra) ou uma imagem embutida "data:image/...;base64,..." (decodifique e olhe).
- As imagens do enunciado e das alternativas vêm em imagens_links (abra cada link).
- ABRA E OLHE cada imagem antes de escrever e use o que ela mostra para conferir a explicação e o gabarito.
- No texto revisado, coloque CADA marcador [[IMGn]] do comentário exatamente uma vez, no ponto em que fizer sentido. NÃO escreva a tag <img>: o servidor coloca a imagem original no lugar do marcador.
- Se não conseguir ver uma imagem necessária para entender a questão, pule a questão (motivo "imagem não abriu").
- Nunca descreva no comentário algo da imagem que você não viu de fato.

## Fórmulas
- Fórmulas vêm como <span class="render-latex">código LaTeX</span> (ex.: <span class="render-latex">\dfrac{3}{4}</span>). O app desenha a fórmula.
- Mantenha as fórmulas nesse mesmo formato (pode reescrever o LaTeX, mas sem mudar o valor). Não converta frações e contas para texto comum.

## Regras de segurança (obrigatórias)
- Use SOMENTE estas funções: public.cowork_resumo_pendentes, public.cowork_proximas_questoes, public.cowork_imagem, public.cowork_salvar_revisao e public.cowork_pular.
- NUNCA rode insert, update, delete, alter, drop, create nem qualquer outro comando que mude o banco.
- Não leia outras tabelas (usuários, pagamentos, configurações etc.).
- Não mude o gabarito nem o enunciado. Você só escreve o comentário revisado.

## Como reescrever cada comentário (mesmas regras do app)
Você é um editor pedagógico revisando o comentário/resolução de uma questão de concurso público.
- Reescreva com suas próprias palavras (parafraseie, não copie frases do original), mantendo 100% da informação técnica e do gabarito, em tom claro e didático.
- Não invente informação nova, não corte explicações e não mude a conclusão.
- Confira se a explicação bate com o gabarito (campo gabarito_letra) e com as alternativas.
- Quando fizer sentido, explique por que a alternativa correta está certa e, em uma frase curta, por que as outras estão erradas.
- Tire assinaturas, nomes de professores, links, "fonte:", menções a sites de questões ou cursinhos e a lista de referências bibliográficas do fim (livros, editoras). Se o texto ficar curto demais, explique melhor o raciocínio; não mantenha a bibliografia só para passar na trava de tamanho.
- Mantenha todos os marcadores [[IMGn]] (veja "Imagens"). Não remova e não invente imagens.
- Formato: só HTML simples: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, <span class="render-latex"> e os marcadores [[IMGn]]. Sem markdown, sem ``` e sem títulos.
- Siga também as "diretrizes_extras" que vêm junto de cada questão (orientações do professor), quando existirem.

## Quando NÃO salvar (pular)
Nestes casos, NÃO salve: marque como pulada com o motivo (ela não volta nos próximos lotes e fica anotada para o professor):
   select public.cowork_pular('<questao_id>', 'motivo curto');
- o comentário original contradiz o gabarito ou parece errado;
- a questão depende de um texto ou de uma imagem que você não conseguiu ver;
- o comentário original é só "gabarito: X", sem explicação suficiente para reescrever;
- a função recusou duas vezes.

## Relatório final
Ao terminar, mostre:
- quantas questões foram salvas;
- uma tabela das PULADAS com questao_id, disciplina e o motivo;
- 3 exemplos (antes → depois) para eu conferir a qualidade;
- e pergunte se quero fazer outra rodada (mostrando de novo o resumo do que ainda falta).
```

## 3. Conferir

- No painel: **Banco de questões** → filtre as revisadas. As do Cowork aparecem como "Revisada (cowork)".
- Se não gostar de uma, abra a questão e edite ou revise de novo manualmente, como já faz hoje.
- Para listar no SQL Editor as revisadas pelo Cowork hoje:
  `select id, disciplina, left(comentario_revisado, 120) from questoes where revisado_metodo = 'cowork' and revisado_em::date = current_date;`

## Questões puladas

Para ver as que o Cowork pulou e por quê (SQL Editor):
`select p.motivo, p.pulada_em, q.id, q.disciplina from cowork_puladas p join questoes q on q.id = p.questao_id order by p.pulada_em desc;`

Depois de corrigir uma no painel (ou para o Cowork tentar de novo): `delete from cowork_puladas where questao_id = '...';`

## Dicas

- Comece com 10 a 20 questões e confira a qualidade antes de rodadas grandes. Inclua no teste questões com imagem (gráfico, tabela) para confirmar que o Cowork consegue abrir as imagens no seu computador.
- O prompt é sempre o mesmo: o Cowork pergunta a disciplina, a banca e a quantidade a cada rodada.
- A questão só entra nas trilhas depois de revisada. Quando estiver tudo revisado, lembre de desligar o "usar questões ainda não revisadas" das trilhas inteligentes (item do checklist de lançamento no README).
