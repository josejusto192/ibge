// Sons e vibração de feedback (acerto, erro, combo, conclusão).
//
// Sons sintetizados na hora com Web Audio — nenhum arquivo pra baixar.
// Preferência "Sons e vibração" fica no aparelho (localStorage), ligada por
// padrão; o iPhone no modo silencioso também silencia (como em jogos: sessão
// "ambient", que não interrompe a música que o aluno estiver ouvindo).
//
// iPhone só libera áudio dentro de um toque "completo" (touchend/click — o
// pointerdown não conta) e só de verdade depois de tocar algum som ali dentro:
// desbloquearAudio() (ver main.tsx) cria/retoma o AudioContext e toca 1
// amostra muda. Ele também volta "interrupted" depois de ligação ou de o app
// ir pro fundo, então cada toque retoma se precisar.

const CHAVE = 'foco:sons';

export function sonsAtivos(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== 'off';
  } catch {
    return true;
  }
}

export function setSonsAtivos(ativo: boolean) {
  try {
    localStorage.setItem(CHAVE, ativo ? 'on' : 'off');
  } catch {
    // modo privado/sem storage: só não lembra a preferência
  }
}

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

let liberado = false;

export function desbloquearAudio() {
  if (!sonsAtivos()) return;
  if (liberado && ctx?.state === 'running') return;
  try {
    const sessao = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (sessao) sessao.type = 'ambient';
  } catch {
    // Safari antigo: sem audioSession
  }
  const c = contexto();
  if (!c) return;
  try {
    const mudo = c.createBufferSource();
    mudo.buffer = c.createBuffer(1, 1, 22050);
    mudo.connect(c.destination);
    mudo.start(0);
    liberado = true;
  } catch {
    // tenta de novo no próximo toque
  }
}

function nota(c: AudioContext, freq: number, inicio: number, duracao: number, tipo: OscillatorType = 'triangle', volume = 0.16) {
  const t = c.currentTime + inicio;
  const osc = c.createOscillator();
  const ganho = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t);
  ganho.gain.setValueAtTime(0.0001, t);
  ganho.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  osc.connect(ganho).connect(c.destination);
  osc.start(t);
  osc.stop(t + duracao + 0.03);
}

// nota que "sobe" de uma frequência a outra (fogo acendendo)
function varredura(c: AudioContext, de: number, para: number, inicio: number, duracao: number, volume = 0.08) {
  const t = c.currentTime + inicio;
  const osc = c.createOscillator();
  const ganho = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(de, t);
  osc.frequency.exponentialRampToValueAtTime(para, t + duracao);
  ganho.gain.setValueAtTime(0.0001, t);
  ganho.gain.exponentialRampToValueAtTime(volume, t + duracao * 0.6);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  osc.connect(ganho).connect(c.destination);
  osc.start(t);
  osc.stop(t + duracao + 0.03);
}

function tocar(fn: (c: AudioContext) => void) {
  if (!sonsAtivos()) return;
  const c = contexto();
  if (!c) return;
  if (c.state === 'running') fn(c);
  else c.resume().then(() => fn(c)).catch(() => {});
}

export function vibrar(padrao: number | number[]) {
  if (!sonsAtivos()) return;
  try {
    navigator.vibrate?.(padrao);
  } catch {
    // iPhone não suporta vibração pela web — sem problema
  }
}

export const som = {
  // "tic" curtinho ao escolher uma opção (onboarding)
  toque: () => {
    tocar((c) => nota(c, 1174.7, 0, 0.08, 'sine', 0.07));
    vibrar(8);
  },
  // "plim" ascendente (Lá5 → Mi6)
  acerto: () => {
    tocar((c) => {
      nota(c, 880, 0, 0.13);
      nota(c, 1318.5, 0.085, 0.26);
    });
    vibrar(18);
  },
  // "tum-tum" grave e curto — avisa sem punir
  erro: () => {
    tocar((c) => {
      nota(c, 311, 0, 0.14, 'sine', 0.14);
      nota(c, 233, 0.11, 0.24, 'sine', 0.13);
    });
    vibrar([30, 50, 30]);
  },
  // arpejo rápido pra sequência de acertos
  combo: () =>
    tocar((c) => {
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => nota(c, f, i * 0.06, 0.18, 'triangle', 0.1));
    }),
  // fanfarra de módulo concluído
  conclusao: () => {
    tocar((c) => {
      [523.25, 659.25, 783.99].forEach((f, i) => nota(c, f, i * 0.11, 0.2, 'triangle', 0.14));
      nota(c, 1046.5, 0.36, 0.55, 'triangle', 0.16);
      nota(c, 783.99, 0.36, 0.55, 'sine', 0.06);
    });
    vibrar([20, 40, 20, 40, 60]);
  },
  // "fuuum" do fogo acendendo + brilho (ofensiva do dia garantida)
  ofensiva: () => {
    tocar((c) => {
      varredura(c, 196, 784, 0, 0.34, 0.09);
      nota(c, 1318.5, 0.28, 0.4, 'triangle', 0.12);
      nota(c, 1975.5, 0.36, 0.5, 'sine', 0.05);
    });
    vibrar([15, 30, 45]);
  },
};
