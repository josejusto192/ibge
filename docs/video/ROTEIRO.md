# Vídeo de apresentação do Foco — Roteiro (voz ElevenLabs)

**Formato:** vertical 9:16 (Reels e TikTok) · **Duração:** ~34 s · **Estilo:** 100% motion graphics, ninguém aparece.
**Narrador:** o próprio **Foco**, o mascote (mesmo nome do app), falando em primeira pessoa. Ele aparece animado na tela e a boca mexe no ritmo da voz, o que dá personalidade e deixa o vídeo memorável.
**Tom:** animado, amigo, meio moleque. Ele "fala com" o concurseiro, sem cara de propaganda de cursinho.

---

## Roteiro cena a cena

| # | Tempo aprox. | Foco fala | Texto grande na tela | O que aparece |
|---|---|---|---|---|
| 1 | 0,0 – 3,0 s | "Você estuda pra concurso… e no dia seguinte esquece tudo?" | ESQUECEU TUDO? 😵 | Pilha de PDFs e marca-texto caindo e tremendo, fundo azul-noite. |
| 2 | 3,0 – 6,5 s | "Calma! Eu sou o Foco. Comigo, estudar vira jogo." | ESTUDAR VIROU JOGO 🎮 | Tela vira azul, o Foco pula pra dentro, acena, e o logo "foco." aparece. |
| 3 | 6,5 – 11,0 s | "Sua trilha já vem pronta. É só seguir: uma questão de cada vez." | TRILHA PRONTA ✓ | Celular mostrando a trilha se montando; o "próximo passo" pulsa em amarelo. |
| 4 | 11,0 – 16,0 s | "Errou? Relaxa! Eu te explico na hora, com inteligência artificial." | ERROU? EU TE EXPLICO 💬 | Alternativa errada treme em vermelho; abre o chat e o Foco "digita" a explicação. |
| 5 | 16,0 – 20,5 s | "Acertou? Ganha XP! Três seguidas… pegou fogo!" | +10 XP · 🔥 3 SEGUIDAS | Alternativa fica verde, "+10 XP" salta, barra vira laranja com fogo, confete. |
| 6 | 20,5 – 25,0 s | "Estuda um pouquinho todo dia, e a sua ofensiva só cresce." | OFENSIVA: 5 DIAS 🔥 | Fogo cinza acende laranja, número pula de 4 pra 5, dias da semana "carimbados". |
| 7 | 25,0 – 28,5 s | "E o que você errou volta pra revisão, até você acertar." | SEUS ERROS VIRAM REVISÃO | Questões "voam" pra dentro do botão vermelho do caderno de erros. |
| 8 | 28,5 – 34,0 s | "Bora? O primeiro módulo é grátis. Link na bio!" | 1º MÓDULO GRÁTIS · LINK NA BIO | Foco comemorando, ícone do app, logo grande. Segura 1,5 s parado no fim. |

**Total:** ~70 palavras em ~32 s de fala, rápido mas claro.

**Por que ficou assim:**
- O **gancho** é uma pergunta que o concurseiro responde "sim" na cabeça, nos primeiros 2 segundos.
- O mascote **se apresenta na cena 2 com o mesmo nome do app** ("Eu sou o Foco"): personagem e marca viram uma coisa só, e o nome gruda.
- Cada cena mostra **um benefício só**, com uma frase curta: trilha, explicação, recompensa, hábito e revisão.
- O **final** faz uma pergunta ("Bora?"), tira a barreira de preço ("grátis") e diz o que fazer ("link na bio").

---

## Gerando a voz no ElevenLabs

### Configuração recomendada

| Item | Valor |
|---|---|
| Modelo | **Eleven v3** (aceita tags de emoção). Alternativa: **Multilingual v2** (mais estável) |
| Voz | Português do Brasil, jovem, energética e simpática. Na Voice Library, filtre por *Portuguese › Brazilian*, *Young*, *Conversational/Animated*. Uma voz levemente aguda combina com um mascote. Teste 3 ou 4 vozes com a frase da cena 2 antes de escolher. |
| Estabilidade | v3: **Creative** (ou Natural se sair exagerado) · v2: **35–45%** |
| Similaridade | **75%** |
| Estilo (v2) | **30–45%** |
| Velocidade | **1,05–1,10** (reels pedem ritmo) |
| Formato | MP3 44,1 kHz 192 kbps (ou WAV) |

### Gere uma cena por vez (importante)

Gere **8 arquivos separados**, um por cena. Assim:
- dá pra refazer só a frase que não ficou boa;
- no Remotion, cada cena **se ajusta sozinha** ao tamanho do seu áudio (sem precisar marcar tempo à mão);
- as pausas entre cenas ficam controladas (0,15 s entre uma e outra).

Nomeie assim: `cena-1.mp3`, `cena-2.mp3`, …, `cena-8.mp3`. Gere 2 ou 3 versões de cada e fique com a melhor.

### Texto para colar (já escrito do jeito que a IA lê melhor)

> Siglas foram escritas como se falam ("xis pê" em vez de XP), senão a voz pode ler errado. As **[tags]** funcionam no Eleven v3; no Multilingual v2, apague as tags.

**Cena 1**
```
[curioso] Você estuda pra concurso... e no dia seguinte, esquece tudo?
```

**Cena 2**
```
[animado] Calma! Eu sou o Foco. Comigo, estudar vira jogo!
```

**Cena 3**
```
Sua trilha já vem prontinha. É só seguir: uma questão de cada vez.
```

**Cena 4**
```
Errou? [tranquilo] Relaxa! Eu te explico na hora, com inteligência artificial.
```

**Cena 5**
```
[empolgado] Acertou? Ganha xis pê! Três seguidas... [risada curta] pegou fogo!
```

**Cena 6**
```
Estuda um pouquinho todo dia, e a sua ofensiva só cresce.
```

**Cena 7**
```
E o que você errou volta pra revisão, até você acertar.
```

**Cena 8**
```
[animado] Bora? O primeiro módulo é grátis. Link na bio!
```

### Se algo sair estranho

- **"XP" lido errado:** tente "xis-pê" (com hífen).
- **Ficou lento:** aumente a velocidade (até 1,15) em vez de cortar palavras.
- **Emoção exagerada no v3:** troque Creative por Natural, ou tire a tag.
- **Passou de 36 s no total:** encurte a cena 3 para "Sua trilha já vem pronta. É só seguir." e a cena 4 para "Errou? Relaxa, eu te explico na hora!".

---

## Ganchos alternativos (troque só a cena 1 para testar)

1. **"Você estuda pra concurso… e no dia seguinte esquece tudo?"** *(principal)*
2. **"E se estudar pra concurso fosse tão viciante quanto um jogo?"**
3. **"Oi! Eu sou o motivo de você não largar os estudos."** (o mascote já abre o vídeo, e a cena 2 vira só "Sou o Foco, e comigo estudar vira jogo.")
4. **"Pare de estudar pra concurso do jeito chato."**

Poste a versão 1 e, alguns dias depois, uma com o gancho 2 ou 3. No Remotion basta trocar `cena-1.mp3` e o texto da cena 1.

---

## Música, efeitos e legendas

- **Música:** pop/eletrônica animada, 118–128 BPM, sem voz. Use música com licença comercial: no TikTok, a *Biblioteca de Música Comercial*; em geral, bancos como Epidemic ou Artlist. Ela fica baixa (cerca de −14 dB) enquanto o Foco fala.
- **Efeitos:** os mesmos sons do app (o "plim" do acerto, o "tum-tum" do erro, o arpejo das 3 seguidas, o "fuuum" do fogo). O handoff explica como gerar.
- **Legendas:** sempre queimadas no vídeo, porque muita gente assiste sem som. Estilo no handoff.

## Legenda do post (sugestão)

> Estudar pra concurso não precisa ser chato 😅
> No Foco você segue uma trilha pronta de questões comentadas, ganha XP, mantém sua ofensiva 🔥 e ainda tem um tutor com IA que explica o que você errou.
> O primeiro módulo é grátis — link na bio!
>
> #concurso #concursopublico #concurseiro #estudos #questoescomentadas #rotinadeestudos #foco

**Capa do vídeo:** o mascote comemorando + "ESTUDAR PRA CONCURSO VIROU JOGO".
