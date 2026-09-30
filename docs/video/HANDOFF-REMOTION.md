# Handoff — Vídeo "Foco" em Remotion

Documento para montar o vídeo de apresentação do app **Foco** com **Remotion**, a partir do roteiro em [`ROTEIRO.md`](./ROTEIRO.md). O objetivo é um vídeo vertical, rápido e "gostoso" de ver, com a cara do app: cores, mascote (Foco), botões 3D e as mesmas animações.

**É 100% motion graphics (ninguém aparece).** O narrador é o próprio **Foco**, com voz gerada no ElevenLabs (um arquivo por cena). Sempre que ele estiver na tela, a **boca mexe no ritmo da voz** (seção 5.1).

**Materiais nesta pasta**

| Pasta/arquivo | O que é |
|---|---|
| `ROTEIRO.md` | Narração, texto na tela e tempo de cada cena |
| `referencias/*.png` | Capturas reais das telas do app (390×844 pt, @3x) — use como **referência de layout**. A fonte nelas saiu como fonte do sistema; no vídeo use as fontes da seção 3. |
| `assets/mascote-*.svg` | Foco em cada expressão (idle, thinking, happy, celebrate, encourage, wave) — SVG estático, viewBox 0 0 144 144 |
| `assets/icone-app-512.png` | Ícone do app |
| `assets/trilha-pattern.webp` | Padrão de fundo claro das telas (ícones de estudo em traço) |
| `assets/bg-blue-texture.jpg` | Textura azul (fundo do login/onboarding) |
| Código do app | `src/components/Mascot.tsx` (SVG animável do Foco), `src/delight.css` (todas as animações), `src/lib/efeitos.ts` (sons), `src/index.css` (cores) |

---

## 1. Especificações gerais

| Item | Valor |
|---|---|
| Resolução | **1080 × 1920** (9:16) |
| FPS | **30** |
| Duração | ~34 s (**1020 frames**) — o valor final vem do áudio (seção 4) |
| Composição | `id="FocoReel"` |
| Exportação | H.264, CRF 18, áudio AAC 320 kbps, `yuv420p` → `out/foco-reel.mp4` |
| Capa | frame da cena 8 (Foco comemorando + logo) → `out/capa.png` via `npx remotion still` |

### Zonas seguras (Reels + TikTok)

A interface das redes cobre partes do vídeo. **Nada importante** (texto, logo, rosto do Foco) fora desta área:

- topo: livre a partir de **y = 220**
- base: livre até **y = 1480** (abaixo disso ficam legenda do post, botões e música)
- direita: livre até **x = 900** (coluna de curtir/comentar)
- esquerda: a partir de **x = 60**

Legendas da narração ficam centralizadas em **y ≈ 1330–1450**. Crie um `<SafeZoneOverlay/>` que desenha essas margens só no Studio (`getRemotionEnvironment().isStudio`).

---

## 2. Setup do projeto

```bash
npx create-video@latest foco-video   # template "Blank", TypeScript
cd foco-video
npm i @remotion/google-fonts @remotion/transitions @remotion/media-utils @remotion/shapes
# opcional, para legendas automáticas com tempo por palavra:
npm i @remotion/install-whisper-cpp @remotion/captions
```

Copie para `public/`:
- `public/audio/cena-1.mp3` … `cena-8.mp3` (voz do Foco, ElevenLabs, uma por cena)
- `public/audio/musica.mp3` (trilha licenciada)
- `public/audio/sfx/*.wav` (gerados — seção 7)
- `public/img/` ← tudo de `docs/video/assets/`

Estrutura sugerida:

```
src/
  Root.tsx              // registra <Composition id="FocoReel" .../>
  FocoReel.tsx          // <Series>/<TransitionSeries> das 8 cenas + áudio + legendas
  timings.ts            // tempos de cada cena (em segundos) — ÚNICA fonte da verdade
  tokens.ts             // cores, fontes, sombras
  components/
    Foco.tsx        // mascote animado por frame (seção 5)
    Phone.tsx           // moldura de celular
    Button3D.tsx
    Alternativa.tsx
    FeedbackBar.tsx
    Pill.tsx            // "+10 XP", "3 seguidas"
    Chama.tsx           // fogo (ícone Fire do Phosphor)
    Confete.tsx         // confete determinístico por frame
    Legenda.tsx         // legendas queimadas
    Super.tsx           // texto grande de cada cena
    SafeZoneOverlay.tsx
  scenes/
    S1Gancho.tsx … S8Cta.tsx
```

> **Regra do Remotion:** nada de `animation:`/`transition:` do CSS, `setTimeout` ou `Math.random()` — tudo tem que depender de `useCurrentFrame()` (senão o render sai diferente do preview). As animações de `src/delight.css` foram convertidas na seção 5 para `interpolate`/`spring`. Para aleatoriedade use `random('seed')` do Remotion.

---

## 3. Identidade visual (tokens)

```ts
// tokens.ts
export const cor = {
  azul: '#1557E6', azulEscuro: '#0E3DAE', azulClaro: '#EEF3FF', azulBorda: '#CFE0FF',
  amarelo: '#FFCB2D', amareloSombra: '#E0A800',
  tinta: '#0B1F4D', tintaSuave: '#3A4257', texto2: '#6B7488', texto3: '#8791A8',
  fundoApp: '#F4F6FC', branco: '#FFFFFF', borda: '#E6EAF5',
  verde: '#22A06B', verdeEscuro: '#17784F', verdeClaro: '#E5F6EE',
  vermelho: '#E5484D', vermelhoEscuro: '#B8343A', vermelhoClaro: '#FDECEC',
  laranja: '#FF7A00', laranjaFim: '#FFB800', laranjaClaro: '#FFF1E0',
  bochecha: '#FFB0A3', noite: '#07122E',
};
export const gradFogo = 'linear-gradient(90deg, #FF7A00, #FFB800)';
export const gradAzul = 'linear-gradient(160deg, #2F6BF0 0%, #1557E6 55%, #0E3DAE 100%)';
```

**Fontes** (`@remotion/google-fonts`):
- **Plus Jakarta Sans 800**: títulos, textos grandes, números (letter-spacing −2% nos títulos)
- **Manrope 700/800**: legendas, pills, textos de interface

**Linguagem visual do app** (repetir no vídeo):
- **Botão 3D:** fundo sólido + sombra sólida embaixo (`box-shadow: 0 {6*s}px 0 <cor escura>`); ao "tocar" desce 4 px e a sombra vai para 2 px. Azul `#1557E6/#0E3DAE`, verde `#22A06B/#17784F`, vermelho `#E5484D/#B8343A`.
- **Cartões:** branco, raio 18–24 px, borda 1,5 px `#E6EAF5`, sombra suave `0 10px 28px -18px rgba(11,31,77,.4)`.
- **Pills:** raio 99 px, Manrope 800. XP = azul `#1557E6` com texto branco; sequência/ofensiva = `gradFogo`.
- **Logo:** Foco numa caixa `#EEF3FF` com raio 13 px + "foco" em Plus Jakarta 800 cor `#0B1F4D` + ponto "." em `#FFCB2D`.

**Supers (texto grande de cada cena):** Plus Jakarta Sans 800, 92–110 px, caixa alta, cor branca com contorno/sombra `0 8px 0 rgba(11,31,77,.35)` quando sobre fundo azul; sobre fundo claro, `#0B1F4D` com palavra-chave destacada em `#1557E6` ou `gradFogo`. Entram palavra por palavra (ver "pop de palavra" na seção 6).

---

## 4. Tempo: tudo amarrado no áudio (automático)

Cada cena tem seu próprio arquivo de voz. A duração da cena = **duração do áudio + folga**, calculada no `calculateMetadata` da composição. Trocou um áudio no ElevenLabs? O vídeo se reajusta sozinho.

```ts
// timings.ts
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { staticFile } from 'remotion';

export const FPS = 30;
export const cenas = [
  { id: 'gancho',   audio: 'audio/cena-1.mp3', antes: 0.15, depois: 0.25, minimo: 3.0 },
  { id: 'logo',     audio: 'audio/cena-2.mp3', antes: 0.10, depois: 0.30, minimo: 3.5 },
  { id: 'trilha',   audio: 'audio/cena-3.mp3', antes: 0.10, depois: 0.30, minimo: 4.5 },
  { id: 'erro',     audio: 'audio/cena-4.mp3', antes: 0.10, depois: 0.60, minimo: 5.0 }, // folga p/ ver o chat digitando
  { id: 'acerto',   audio: 'audio/cena-5.mp3', antes: 0.10, depois: 0.40, minimo: 4.5 },
  { id: 'ofensiva', audio: 'audio/cena-6.mp3', antes: 0.10, depois: 0.40, minimo: 4.5 },
  { id: 'caderno',  audio: 'audio/cena-7.mp3', antes: 0.10, depois: 0.30, minimo: 3.5 },
  { id: 'cta',      audio: 'audio/cena-8.mp3', antes: 0.10, depois: 1.60, minimo: 5.0 }, // 1,5 s parado no fim
] as const;

// Roteiro "de referência" (s) — os tempos da seção 8 foram escritos para estas durações.
export const duracaoRoteiro = { gancho: 3, logo: 3.5, trilha: 4.5, erro: 5, acerto: 4.5, ofensiva: 4.5, caderno: 3.5, cta: 5.5 };

export async function calcularCenas() {
  const out = [];
  for (const c of cenas) {
    const voz = await getAudioDurationInSeconds(staticFile(c.audio));
    const dur = Math.max(c.minimo, c.antes + voz + c.depois);
    out.push({ ...c, voz, frames: Math.round(dur * FPS), vozInicio: Math.round(c.antes * FPS) });
  }
  return out;
}
```

```tsx
// Root.tsx
<Composition id="FocoReel" component={FocoReel} width={1080} height={1920} fps={30} durationInFrames={1020}
  defaultProps={{ cenas: [] }}
  calculateMetadata={async () => {
    const cenas = await calcularCenas();
    return { durationInFrames: cenas.reduce((t, c) => t + c.frames, 0), props: { cenas } };
  }} />
```

No `FocoReel`, use `<Series>` (ou `<TransitionSeries>` com transições de 8–10 frames) e, dentro de cada cena, `<Sequence from={vozInicio}><Audio src={staticFile(c.audio)} /></Sequence>`.

**Escala dos tempos internos:** os frames da seção 8 são para a duração de referência (`duracaoRoteiro`). Em cada cena, `const k = framesReais / (duracaoRoteiro[id] * FPS)` e multiplique os marcos por `k`, **exceto** as micro-animações (pops, chacoalhar, carimbo), que ficam com a duração fixa. Os momentos-chave (toque na alternativa, "+10 XP", "pegou fogo", 4→5) devem cair **na palavra** correspondente: use os tempos por palavra do Whisper (abaixo) para ancorá-los, por exemplo "fogo" dispara o confete.

**Legendas e âncoras por palavra:** rode `@remotion/install-whisper-cpp` + `transcribe()` (modelo `medium`, `language: 'pt'`, `tokenLevelTimestamps: true`) em cada `cena-N.mp3` e salve `public/legendas/cena-N.json`. Use em `createTikTokStyleCaptions()` (`@remotion/captions`) para as legendas e numa função `momento('fogo')` para ancorar animações. O texto das legendas deve ser o do roteiro ("XP"), não a grafia fonética usada no ElevenLabs: corrija no JSON.

**Batidas:** com música a 120 BPM, uma batida = 15 frames. Quando possível, alinhe cortes de cena e "pops" em múltiplos de 15 depois do primeiro tempo forte.

---

## 5. O Foco (componente `<Foco mood frame />`)

Base: copie o SVG de `src/components/Mascot.tsx` (viewBox 0 0 144 144; mesmos grupos). Os `.svg` em `assets/` mostram cada expressão parada. No app as animações são CSS; no Remotion, cada grupo recebe `transform` calculado a partir do frame.

**Grupos e pontos de giro** (`transform-origin` em unidades do viewBox — use `transformBox: 'view-box'` ou aplique `translate/rotate/translate` manualmente):

| Grupo | Pivô |
|---|---|
| `m-jump` (corpo inteiro que pula) | — (só translateY) |
| `m-body` (estica/amassa) | 72, 122 (pés) |
| `m-shadow` (sombra elíptica) | 72, 127 |
| `m-eyes` (piscar) | 72, 59 |
| `m-arm-l` / `m-arm-r` | 42, 73 / 102, 73 (ombros) |
| `m-antenna` | 72, 28 |
| `m-spark` (estrelinhas) | centro de cada uma |

**Conversão das animações** (t = segundos dentro da cena; `ciclo(t, T)` = `(t % T) / T`; interpolações com `Easing.inOut(Easing.ease)` salvo indicado):

| Humor | Parte | Animação (de `src/delight.css`) |
|---|---|---|
| todos | olhos | piscar a cada 4,2 s: `scaleY` 1 → 0,1 → 1 entre 91% e 100% do ciclo |
| idle / wave | corpo | respirar 2,8 s: `scale(1,1) → (1.02,0.98) → (1,1)` |
| idle | pupilas | olhar 7 s: 0–30% parado; 36–52% `translate(2.4,-0.8)`; 58–74% `(-2.4,0.4)`; volta |
| idle / wave / encourage | antena | balançar 3,2 s: `rotate(-7° → 7° → -7°)` |
| **thinking** | pulo | 0,9 s: `translateY 0 → -12 (45%) → 0`; corpo `scale(1.07,.92) → (.95,1.06) 15% → (1,1) 45% → (.97,1.03) 80%`; sombra `scale 1→.72`, opacidade `.12→.07`; pupilas fixas `translate(2,-2.2)`; 3 bolinhas de pensamento acendendo em sequência (1,2 s, atrasos 0/0,2/0,4 s) |
| **happy** | pulinho único | 0,7 s: `translateY 0 → -18 (35%) → 0 (62%) → -4 (78%) → 0`; corpo `scale(1.08,.9) → (.94,1.07) → (1.06,.93) → 1`; braços sobem 80° (esq. +80°, dir. −80°) entre 25% e 70% de 0,9 s; estrelinhas piscando (1,4 s: `scale .55→1.1`, `rotate 0→20°`, opacidade `.35→1`) |
| **celebrate** | festa contínua | pulo 0,85 s `0 → -20 (45%) → 0`; corpo `scale(1.09,.9) → (.94,1.08) 15% → 1`; braços abanando 0,42 s (esq. 70°↔100°, dir. −70°↔−100°); 3 estrelinhas com atrasos 0/0,45/0,9 s |
| **encourage** | força | corpo inclina 1,6 s ×2 (`rotate 0 → -4° → 3° → 0`); braço direito "faz força" 1,5 s: `0 → -118° → -96° → -118° → -96° → -108°` e fica |
| **wave** | tchau | braço direito 2,6 s: `0 (0–12%) → -122° → -96° → -124° → -96° → -120° → 0 (74%)` |

Dica: crie `usaCiclo(segundos)` e `keyframes(t, [[0,v0],[0.45,v1],[1,v2]])` para não repetir `interpolate`.

### 5.1 Boca falando (lip-sync simples)

O Foco é o narrador: sempre que estiver na tela, a boca acompanha a voz.

```ts
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
const audio = useAudioData(staticFile(`audio/cena-${n}.mp3`));
const vol = audio ? visualizeAudio({ fps, frame: frame - vozInicio, audioData: audio, numberOfSamples: 16 })
  .slice(1, 6).reduce((a, b) => a + b, 0) / 5 : 0;
const abertura = Math.min(1, vol * 6); // 0 = fechada, 1 = aberta
```

- Troque o `<path class="m-mouth">` por uma boca "D" deitada: largura 14 → 18 (viewBox), altura `2 + abertura * 9`, fundo `#0B1F4D`, língua `#FF8A8A` aparecendo quando `abertura > 0.5`.
- Suavize: `abertura` = média dos últimos 2 frames (evita tremedeira).
- Enquanto fala: antena balança um pouco mais (±10°), cabeça acompanha (`rotate` ±2° com a abertura).
- Sem voz (entre frases): volta à boca sorrindo do humor atual.
- Quando o Foco **não** está na tela (cenas 3, 5, 6 e 7 dentro do celular), mostre um **Foco pequeno (160 px) no canto inferior esquerdo** (x = 90, y = 1330, dentro da zona segura), falando, como um apresentador. Ele entra com a entrada padrão na cena 3 e fica até a cena 7.

**Entrada padrão do Foco** (quando surge numa cena): `spring({ frame, fps, config: { damping: 11, stiffness: 160, mass: 0.8 } })` em `scale 0.4 → 1` + `translateY 60 → 0`, com um "squash" no pouso (corpo `scaleY 0.9 → 1` nos 6 frames seguintes).

---

## 6. Animações padrão (receitas)

| Nome | Receita |
|---|---|
| **pop** (cartões, pills, números) | `spring({ config: { damping: 12, stiffness: 200 } })` → `scale 0.5 → 1` + `opacity 0 → 1` (opacidade chega a 1 em 6 frames) |
| **pop de palavra** (supers) | cada palavra entra 3 frames depois da anterior: `translateY 40 → 0`, `scale 0.8 → 1`, `rotate -4° → 0`, spring damping 13 |
| **chacoalhar** (erro) | 12 frames: `translateX` 0, −9, 8, −6, 5, −3, 0 (px @1x; multiplique pela escala do celular) |
| **toque** (dedo/cursor) | círculo branco 70 px, opacidade .9, aparece 4 frames antes, "aperta" (`scale 1 → 0.85`) no frame do toque, some com onda (`scale 1 → 2`, opacidade → 0, 10 frames) |
| **botão 3D apertando** | no toque: `translateY 0 → 4`, sombra `6 → 2` em 3 frames; volta em 5 frames |
| **contagem** (XP, %, dias) | `interpolate(frame, [ini, ini+27], [0, alvo], { easing: Easing.out(Easing.cubic) })`, arredondado |
| **brilho da barra** | faixa branca 30% de largura com gradiente passando da esquerda pra direita em 18 frames |
| **confete** | 120 partículas (cores `#1557E6 #FFCB2D #22A06B #FF7A8A #7C5CFF #3A7BFF`), origem em y = 35% da tela, `vx ∈ [-9,9]`, `vy ∈ [-22,-8]`, gravidade 0,55/frame², rotação livre, somem entre 60 e 90 frames. Posição calculada analiticamente por frame (`x = x0 + vx·t`, `y = y0 + vy·t + g·t²/2`) com `random(seed+i)` |
| **transição entre cenas** | `@remotion/transitions`: `slide({ direction: 'from-bottom' })` 10 frames ou `wipe`; entre 1→2 use um **flash azul** (retângulo `#1557E6` com `scale` de 0 → 1 a partir do centro em 8 frames — "a tela vira azul") |
| **zoom de câmera** | o `<Phone>` pode dar leves zooms (`scale 1 → 1.08`) para destacar um elemento, sempre com spring suave (damping 20) |

---

## 7. Sons (efeitos)

Reproduza os sons do app (`src/lib/efeitos.ts`) como arquivos WAV. Eles são sintetizados — gere-os com um script Node de ~40 linhas (seno/triângulo + envelope exponencial, 48 kHz, escrevendo o cabeçalho WAV à mão) ou no Audacity (Gerar → Tom):

| Arquivo | Notas (Hz · início s · duração s · onda · volume) |
|---|---|
| `sfx/acerto.wav` | 880 · 0 · 0,13 · triângulo · 0,16 → 1318,5 · 0,085 · 0,26 · triângulo · 0,16 |
| `sfx/erro.wav` | 311 · 0 · 0,14 · seno · 0,14 → 233 · 0,11 · 0,24 · seno · 0,13 |
| `sfx/combo.wav` | 1046,5 / 1318,5 / 1568 / 2093, cada uma 0,18 s, a cada 0,06 s, triângulo, 0,10 |
| `sfx/conclusao.wav` | 523,25 / 659,25 / 783,99 a cada 0,11 s (0,2 s, triângulo, 0,14); em 0,36 s: 1046,5 (0,55 s, tri, 0,16) + 783,99 (0,55 s, seno, 0,06) |
| `sfx/ofensiva.wav` | varredura 196 → 784 Hz em 0,34 s (triângulo, 0,09) + 1318,5 em 0,28 s (0,4 s, tri, 0,12) + 1975,5 em 0,36 s (0,5 s, seno, 0,05) |
| `sfx/whoosh.wav` | ruído branco filtrado passa-banda subindo 400 → 3000 Hz em 0,25 s (transições) |
| `sfx/toque.wav` | clique curto: seno 1200 Hz, 0,03 s |

Envelope de cada nota: começa em 0,0001, sobe até o volume em 12 ms, cai exponencialmente até 0,0001 no fim.

**Mixagem:** narração 0 dB · música −14 dB com a voz / −8 dB sem voz (`volume` por frame com `interpolate`) · efeitos −6 dB. Fade-in da música em 10 frames, fade-out nos últimos 20.

---

## 8. Cenas em detalhe

Tempos em frames relativos ao início da cena (30 fps). O `<Phone>` tem **760 × 1644 px** (≈ proporção do iPhone), raio 90 px, moldura `#0B1F4D` de 18 px, sombra `0 60px 120px -40px rgba(11,31,77,.55)`; conteúdo em escala **1,95×** sobre a tela de 390 pt do app. Posição padrão: centralizado em x, topo em y = 250.

### Cena 1 — Gancho · 0–90 (3 s)
- **Fundo:** `#07122E` (azul-noite) com vinheta.
- **0–10:** super "ESQUECEU" (palavra a palavra) em branco, y = 700, 110 px.
- **5–60:** 6–8 "folhas" (retângulos brancos 300×400 com linhas cinza imitando PDF, marca-texto amarelo em diagonal) caem de cima girando (`rotate` aleatório ±25°), com leve tremida (`translateX` seno 3 px, 12 Hz).
- **30:** "TUDO?" + emoji 😵 pop, 130 px, amarelo `#FFCB2D`.
- **60–90:** as folhas "desfocam" (`filter: blur(0 → 6px)`) e escurecem; tremor aumenta.
- **Som:** `whoosh` no 0; batida da música entra no 0.
- **Saída (80–90):** flash azul (ver seção 6) cobrindo tudo a partir do centro.

### Cena 2 — "Eu sou o Foco" + logo · 0–105 (3,5 s)
- **Fundo:** `gradAzul` + `bg-blue-texture.jpg` com 25% de opacidade (modo `overlay`).
- **0–18:** Foco (humor **happy**, 520 px) entra de baixo com a "entrada padrão" (seção 5); pousa em y ≈ 820 (centro).
- **18–50:** vira **wave** (acena).
- **24–40:** o Foco vai para a esquerda (x −170) e o logotipo "foco." surge à direita: letras de "foco" em pop (3 frames entre letras), o "." amarelo cai quicando por último (spring damping 8). Texto 150 px, branco (sobre azul).
- **45–105:** frase de apoio abaixo, Manrope 800 54 px branco 90%: "estudar pra concurso **virou jogo** 🎮" ("virou jogo" com fundo `#FFCB2D` e texto `#0B1F4D`, marcador que "pinta" da esquerda para a direita em 10 frames). O marcador aparece quando o Foco diz "jogo".
- O Foco fala a cena inteira (boca sincronizada) e dá um pulinho (**happy**) em "Foco".
- **Som:** `conclusao` baixinho (−10 dB) no frame 18.

### Cena 3 — Trilha pronta · 0–135 (4,5 s)
Referências: `referencias/02-trilha.png`, `11-trilha-comemora-modulo.png`.
- **Fundo:** `#F4F6FC` + `trilha-pattern.webp` (repetição 480 px, opacidade 0,7), deslizando para cima devagar (parallax, 0,6 px/frame).
- **0–20:** `<Phone>` sobe de y = 1920 → 250 (spring damping 16).
- **Conteúdo do celular (recriar a tela, não usar print):** cabeçalho com logo (Foco na caixinha), pill de fogo "🔥 4" (fundo `#FFF1E0`, borda `#FFC27A`) e pill "⚡ 340 XP" (fundo `#EEF3FF`); cartão azul "TRILHA ATUAL · Concursos · Nível Médio" (não citar órgão/banca específico); barra "Meta 3/20".
- **Trilha:** caminho pontilhado (traço `#D8E2F5`, 5 px, `dasharray 3 12`, curva em S — mesma fórmula do app: `x = 160 + sin(i·π/2)·66`, passo vertical 170 pt) com 5 nós de 72 pt (borda branca 5 pt):
  - nós 1–2 **concluídos** (azul `#1557E6`, sombra `0 5px 0 #0E3DAE`, ✓ branco) + legenda "Estatística básica · 5/6 acertos", "Porcentagem · 6/6";
  - nó 3 **atual** (amarelo `#FFCB2D`, sombra `#E0A800`, ▶ azul-escuro) com balão "SEU PRÓXIMO PASSO" e anel pulsando (`box-shadow 0 0 0 0 → 11px`, 2,3 s em loop);
  - nós 4–5 **bloqueados** (cinza `#E6EAF5`, cadeado `#97A5BF`).
- **25–70:** nós aparecem em cascata (pop, 5 frames entre cada), o pontilhado "desenha" (`strokeDashoffset`) junto.
- **70–120:** a trilha rola para cima 300 pt (a câmera acompanha); o nó atual chega ao centro e dá um "pulo" (scale 1 → 1,15 → 1).
- **Super** (fora do celular, y = 1500 → **atenção à zona segura**: use y ≈ 1380): "TRILHA PRONTA ✓", pop de palavra no frame 30.
- **Som:** `toque` em cada nó (volume −18 dB), `combo` suave no pulo do nó atual.

### Cena 4 — Errou? O Foco explica · 0–150 (5 s)
Referências: `05-questao-selecionada.png`, `06-questao-erro.png`, `08-mascote-chat.png`.
- **0–15:** transição `slide from-right` dentro do celular para a tela da questão: barra de progresso no topo (azul, 1/6), "Estatística básica · Questão 1 de 6"; cartão com enunciado (Manrope 700, `#0B1F4D`): *"Qual é a média aritmética de 2, 4, 6, 8 e 10?"*; 5 alternativas (cartões brancos com letra num quadradinho `#F4F6FC`). Alternativas: A) 5 · **B) 6** · C) 7 · D) 8 · E) 30.
- **20:** "toque" na alternativa **C** → ela fica selecionada (borda azul 2 px, fundo `#EEF3FF`, letra em azul) · som `toque`.
- **32:** toque no botão 3D azul "Confirmar resposta" (aperta).
- **38:** **erro** — alternativa C fica vermelha (borda `#E5484D`, fundo `#FDECEC`, ✕ branco em quadrado vermelho com pop) e **chacoalha**; B fica verde (borda `#22A06B`, fundo `#E9F7F0`, ✓); as demais esmaecem (opacidade 0,45). Som `erro`.
- **40–55:** barra de feedback sobe da base do celular (`translateY 100% → 0`, spring): fundo `#FDECEC`, Foco **encourage** (62 pt) + "Não foi dessa vez" (Plus Jakarta 800, `#C0392B`) + "Resposta certa: B"; botão vermelho "Próxima questão".
- **60:** botão azul-claro "Ainda com dúvida? **Chame o Foco**" (com Foco acenando 34 pt) aparece acima da barra; toque nele no 70.
- **75–95:** folha do chat sobe (raio superior 28 pt, fundo branco, fundo do app escurece 45%): cabeçalho com Foco (humor **thinking**) em caixa `#EEF3FF` + "Foco · tutor com IA".
- **95–150:** balão do Foco (fundo `#F4F6FC`, raio `16 16 16 4`) com o texto sendo **digitado** (2 caracteres/frame): *"A média é a soma dividida pela quantidade: 2+4+6+8+10 = 30, e 30 ÷ 5 = **6** 😉"* Quando o texto termina, o Foco do cabeçalho troca para **happy**.
- **Super:** "ERROU? **EU TE EXPLICO** 💬" (destaque em `#1557E6`), no frame 45, y ≈ 230 (acima do celular: reduza o celular para escala 0,92 nesta cena para caber).

### Cena 5 — Acertou! XP + combo · 0–135 (4,5 s)
Referência: `07-questao-acerto-combo.png`.
- **0–10:** corte seco para outra questão (mesma estrutura), barra de progresso em 3/6.
- **12:** toque na alternativa **B**; **20:** toque em "Confirmar".
- **24:** **acerto** — B verde com pop do ✓ (`scale 0 → 1.3 → 1`); som `acerto`.
- **26–45:** barra de feedback verde (`#E5F6EE`): Foco **happy** (pulinho + braços para cima), "Mandou bem!" (Plus Jakarta 800 `#17784F`); pill **"+10 XP"** azul salta (`xp-pop`: `translateY 10 → -3 → 0`, `scale .6 → 1.12 → 1`) e voa até o pill de XP do cabeçalho (curva de Bézier, 18 frames), que conta 340 → 350.
- **55–70:** mais dois acertos rápidos em montagem (3 frames de "flash" branco entre eles), cada um com `acerto`.
- **75:** **combo**: pill laranja **"🔥 3 seguidas!"** (gradiente de fogo) com `combo-pop` (`scale .4 → 1.15 → 1`, `rotate -8° → 3° → 0`); a barra de progresso vira laranja com brilho correndo; no topo, "🔥 3 seguidas" em `#E8590C`. Som `combo`. **Confete** a partir do centro do celular.
- **Super:** "+10 XP" (azul) no 26 e "🔥 3 SEGUIDAS" (gradiente de fogo) no 75, empilhados, y ≈ 1380.

### Cena 6 — Ofensiva · 0–135 (4,5 s)
Referências: `10-ofensiva-estendida.png`, `04-janela-ofensiva.png`.
- **Fundo:** sai do celular → tela cheia branca (o conteúdo "cresce" para fora do celular: `scale` do Phone 1 → 1,6 e moldura some com opacidade em 12 frames).
- **0–20:** fogo grande (ícone `Fire` do Phosphor, `weight="fill"`, 300 px) **cinza** `#B4BCCF` dentro de um halo `#F6F8FC`; número **4** cinza (Plus Jakarta 800, 200 px); "DIAS DE OFENSIVA" (Manrope 800, 44 px, `#6B7488`, espaçamento 0,08 em).
- **20–50:** semana (S T Q Q S S **D**) — 7 bolinhas de 100 px aparecendo em cascata (3 frames): as 4 anteriores laranja (gradiente de fogo com ✓), hoje tracejada `#FFB070`.
- **50:** **carimbo** no dia de hoje (bolinha entra de `scale 1.9, rotate -20°, opacidade 0` → `0.92, 4°` → `1, 0°` em 17 frames) · som `ofensiva`.
- **52–72:** o fogo **acende**: cor cinza → `#FF7A00` (interpolar cor), halo vira `radial-gradient(#FFE3C2, #FFF4E600)`, "chama-acende" (`scale .7 → 1.28 → 1`, `rotate -5° → 0`) e depois tremula em loop (`chama` 1,6 s: `scale(1,1) → (1.08,1.14) rot -4° → (.96,1.04) rot 3°`, pivô na base).
- **56:** o número troca **4 → 5**: o 4 sai para cima e o **5** laranja cai de cima (`translateY -40 → 0`, `scale .6 → 1`, spring damping 10).
- **75–135:** "Ofensiva estendida!" (Plus Jakarta 800, 76 px) + "Volte amanhã para chegar a 6!" (Manrope 700, 44 px, `#6B7488`) em tip-in; brasas (partículas laranja pequenas subindo) em volta do fogo.
- **Super:** pode ser o próprio "5 DIAS DE OFENSIVA" (a cena já é um grande texto).

### Cena 7 — Erros viram revisão · 0–105 (3,5 s)
Referências: `02-trilha.png` (botão vermelho flutuante com o número).
- **Fundo:** `#F4F6FC` + padrão.
- **0–15:** o **botão do caderno** (círculo 260 px, gradiente `#EF5A5A → #C9302C`, borda branca 14 px, ícone de caderno branco, badge amarelo `#FFCB2D` com número) entra com pop no centro, badge = **0**.
- **15–70:** 3 mini-cartões de questão (brancos, 320×200, com ✕ vermelho no canto e 3 linhas cinza de texto) vêm das bordas em arco e são "engolidos" pelo botão (`scale → 0.2`, `opacity → 0`); a cada um o badge sobe (1, 2, 3) com pop, e o botão faz "gulp" (`scale 1 → 1.12 → 1`). Som `toque` a cada entrada.
- **75–105:** o botão encolhe e vai para o canto; entra uma lista em "Revisão" com a primeira questão virando verde ✓ e o texto "+10 XP · saiu do caderno" (pill azul). Som `acerto`.
- **Super:** "SEUS ERROS VIRAM **REVISÃO**", y ≈ 300.

### Cena 8 — CTA · 0–165 (5,5 s: ~3,5 s de fala + ~1,6 s parado)
- **Fundo:** `gradAzul` + textura; confete contínuo leve (40 partículas caindo do topo, velocidade baixa).
- **0–20:** o Foco pequeno do canto **cresce e vai para o centro** (vira 560 px, y = 700) e muda para **celebrate**; fala "Bora?" olhando para a câmera (pupilas no centro), com a boca sincronizada.
- **10–30:** ícone do app (`icone-app-512.png`, 220 px, raio 50 px, sombra forte) desliza para o lado do Foco e "gira" levemente (`rotate -8° → 0`).
- **20–45:** logo "foco." 170 px branco, abaixo (y = 1080), com o "." amarelo quicando.
- **45–70:** selo **"1º MÓDULO GRÁTIS"**: pill amarela `#FFCB2D` com texto `#0B1F4D` (Manrope 800, 58 px), sombra 3D `0 8px 0 #E0A800`, entra com `combo-pop` e fica "respirando" (`scale 1 ↔ 1.04`, 1,2 s).
- **70–100:** botão 3D branco "**Link na bio** 👆" (texto azul, sombra `#CFE0FF`), em y ≈ 1380, fazendo o "aperta e solta" a cada 1 s (convidando ao toque).
- **100–165:** tudo parado (só respiração e confete) — isso vira o final do loop e a capa.
- **Som:** `conclusao` no 0; a música sobe (−8 dB) quando a fala termina.
- **"Link na bio"** dispara no momento em que ele fala "bio" (âncora do Whisper).

---

## 9. Legendas queimadas (`<Legenda/>`)

- **Fonte:** Manrope 800, 58 px, branco, com contorno `#0B1F4D` de 10 px (`paint-order: stroke`) e sombra `0 6px 0 rgba(11,31,77,.35)`.
- **Posição:** centralizada, largura máx. 860 px, base em y = 1450 (dentro da zona segura).
- **Estilo TikTok:** até 5 palavras por vez; a palavra sendo falada fica **amarela** `#FFCB2D` e dá um pop pequeno (`scale 1 → 1.08 → 1`).
- **Destaques:** "Foco", "XP", "ofensiva", "grátis" sempre em amarelo.
- **Nas cenas com super grande no mesmo lugar**, esconda a legenda ou suba o super (nunca os dois sobrepostos).

---

## 10. Checklist de qualidade

- [ ] Nenhum texto/rosto fora da zona segura (ligue o `<SafeZoneOverlay/>` no Studio e confira cena a cena)
- [ ] Nada usa CSS animation/transition, `setTimeout` ou `Math.random`
- [ ] Todas as trocas de cena caem numa batida da música
- [ ] Legenda legível no celular com brilho baixo (teste exportando e vendo no telefone)
- [ ] O Foco aparece nos primeiros 3,5 s e a boca dele acompanha a voz em todas as cenas
- [ ] Legendas mostram "XP" (não a grafia fonética do ElevenLabs)
- [ ] Nenhuma menção a órgão específico (IBGE etc.): falar sempre "concurso". As capturas em `referencias/` mostram "IBGE Recenseador" só porque são do ambiente de teste — no vídeo, troque.
- [ ] Os primeiros 2 s já têm movimento e texto (as pessoas decidem ficar nesse tempo)
- [ ] Final de 1,5 s parado (vira capa e dá tempo de ler "Link na bio")
- [ ] Áudio: voz sempre acima da música; picos abaixo de −1 dBFS
- [ ] Render final: `npx remotion render FocoReel out/foco-reel.mp4 --codec h264 --crf 18`
- [ ] Capa: `npx remotion still FocoReel out/capa.png --frame=<último frame da cena 8>`

---

## 11. Prompt pronto para o Claude Cowork

> Estou na pasta do projeto Foco. Leia `docs/video/HANDOFF-REMOTION.md` e `docs/video/ROTEIRO.md`, veja as imagens em `docs/video/referencias/` e os arquivos em `docs/video/assets/`. Crie um projeto Remotion em `../foco-video` seguindo o handoff: tokens, componente `<Foco>` animado por frame (baseado em `src/components/Mascot.tsx` e nas animações de `src/delight.css`), as 8 cenas com duração calculada a partir dos áudios `public/audio/cena-1.mp3` … `cena-8.mp3` (voz do Foco gerada no ElevenLabs), lip-sync da boca do Foco com `visualizeAudio`, efeitos sonoros gerados por script, legendas e âncoras por palavra com Whisper, e o `<SafeZoneOverlay>`. Comece pelas cenas 2 (logo) e 5 (acerto + combo) para validarmos o estilo antes de fazer o resto. Quando terminar cada cena, abra o Remotion Studio e me mostre.
