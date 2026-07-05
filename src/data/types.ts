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
}

export type ModuloStatus = 'locked' | 'current' | 'done';

// Um "módulo" é um nó do caminho da trilha, curado pelo admin: título livre
// e uma lista de questões escolhidas a dedo (modulo_questoes), não mais uma
// disciplina inteira. status/acertos/total vêm de progresso_modulos.
export interface Modulo {
  id: number;
  titulo: string;
  ordem: number;
  status: ModuloStatus;
  acertos: number;
  total: number;
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
