// Formatos alinhados ao schema real do Supabase (tabela `questoes` fornecida
// pelo cliente, mais as tabelas de trilhas/gamificação criadas nas migrations
// em supabase/migrations/). Nomes de campo em português para bater 1:1 com as
// colunas do banco.

export interface Alternativa {
  letra: string;
  texto: string;
  html?: string;
  correta: boolean;
}

export interface Questao {
  id: string;
  enunciado: string;
  enunciado_html?: string;
  tem_imagem: boolean;
  gabarito_letra: string;
  comentario: string;
  comentario_html?: string;
  banca: string;
  ano: number;
  orgao?: string;
  orgao_nome?: string;
  cargo?: string;
  disciplina: string;
  nivel_escolaridade?: string;
  tipo?: string;
  anulada: boolean;
  desatualizada: boolean;
  alternativas: Alternativa[];
  // Aula de apoio vinculada pelo admin — só preenchida no caderno de erros.
  aula?: { titulo: string; video_url: string };
  // Por que o algoritmo colocou esta questão na sessão (migration 028):
  // revisão vencida, questão antiga pra relembrar, reforço de etapa fraca…
  motivo?: MotivoQuestao;
  // Caderno: 0 = errou; 1–3 = revisão programada (1, 7 ou 30 dias).
  revisaoEtapa?: number;
}

export type MotivoQuestao = 'nova' | 'obrigatoria' | 'revisao' | 'relembrar' | 'reforco' | 'repeticao';

export type ModuloStatus = 'locked' | 'current' | 'done' | 'aula';

export type ModuloTipo = 'questoes' | 'aula' | 'inteligente';

// Um "módulo" é um nó do caminho da trilha, curado pelo admin: título livre
// e uma lista de questões escolhidas a dedo (modulo_questoes), não mais uma
// disciplina inteira. status/acertos/total vêm de progresso_modulos.
// Quando tipo === 'aula', o nó é só um vídeo opcional (video_url): não entra
// na sequência obrigatória de questões, status é sempre 'aula'.
export interface Modulo {
  id: number;
  titulo: string;
  ordem: number;
  tipo: ModuloTipo;
  video_url: string | null;
  status: ModuloStatus;
  acertos: number;
  total: number;
  // Exige assinatura e o aluno não tem (só o 1º módulo de questões é grátis).
  premium: boolean;
  // Unidade de trilha inteligente: lições feitas (migration 030).
  etapa?: EtapaProgresso;
  secaoId?: number | null;
}

// Unidade de trilha inteligente: N lições + 1 revisão final.
export interface EtapaProgresso {
  licoes: number;
  licoesFeitas: number;
  estoque: number;
}

export type ConquistaCategoria = 'consistencia' | 'volume' | 'desempenho' | 'trilha' | 'indicacoes';

export interface Conquista {
  id: string;
  categoria: ConquistaCategoria;
  titulo: string;
  glyph: string;
  criterio: (ctx: ConquistaCtx) => boolean;
}

export interface ConquistaCtx {
  streak: number;
  totalQuestoes: number;
  bestAccuracy: number;
  doneModules: number;
  totalModules: number;
  referralsConfirmed: number;
}
