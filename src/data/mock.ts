// Conteúdo estático (não tem tabela própria no banco — é copy/config da UI).
// Questões, trilhas, módulos, progresso, ranking e indicações vêm de
// src/lib/queries.ts (Supabase real). Ver src/contexts/AppDataContext.tsx.
import type { Conquista } from './types';

export const CONQUISTAS: Conquista[] = [
  { id: 'streak_7', categoria: 'consistencia', titulo: '7 dias seguidos', glyph: '🔥', criterio: (c) => c.streak >= 7 },
  { id: 'streak_30', categoria: 'consistencia', titulo: '30 dias seguidos', glyph: '🔥', criterio: (c) => c.streak >= 30 },
  { id: 'streak_100', categoria: 'consistencia', titulo: '100 dias seguidos', glyph: '🔥', criterio: (c) => c.streak >= 100 },
  { id: 'vol_100', categoria: 'volume', titulo: '100 questões', glyph: '✎', criterio: (c) => c.totalQuestoes >= 100 },
  { id: 'vol_500', categoria: 'volume', titulo: '500 questões', glyph: '✎', criterio: (c) => c.totalQuestoes >= 500 },
  { id: 'vol_1000', categoria: 'volume', titulo: '1000 questões', glyph: '✎', criterio: (c) => c.totalQuestoes >= 1000 },
  { id: 'perf_90', categoria: 'desempenho', titulo: '90%+ em uma disciplina', glyph: '★', criterio: (c) => c.bestAccuracy >= 90 },
  { id: 'trilha_1', categoria: 'trilha', titulo: '1º módulo concluído', glyph: '✓', criterio: (c) => c.doneModules >= 1 },
  { id: 'trilha_full', categoria: 'trilha', titulo: 'Trilha concluída', glyph: '🏆', criterio: (c) => c.totalModules > 0 && c.doneModules >= c.totalModules },
  { id: 'ref_1', categoria: 'indicacoes', titulo: '1ª indicação confirmada', glyph: '$', criterio: (c) => c.referralsConfirmed >= 1 },
  { id: 'ref_5', categoria: 'indicacoes', titulo: '5 indicações confirmadas', glyph: '$', criterio: (c) => c.referralsConfirmed >= 5 },
];

export const CATEGORY_COLOR: Record<string, string> = {
  consistencia: '#F5B301',
  volume: '#1557E6',
  desempenho: '#22A06B',
  trilha: '#9b59b6',
  indicacoes: '#1557E6',
};

export const MENTOR_BULLETS = [
  { titulo: 'Plano de estudos personalizado', sub: 'Cronograma feito para o seu edital e prazo.' },
  { titulo: 'Correção de simulados e redação', sub: 'Feedback individual de quem já aprovou.' },
  { titulo: 'Tira-dúvidas com mentor', sub: 'Suporte direto quando você travar.' },
  { titulo: 'Comunidade de concurseiros', sub: 'Estude junto e mantenha a motivação.' },
];

export const REPORT_REASONS = [
  'Erro no enunciado',
  'Gabarito parece incorreto',
  'Imagem não carrega',
  'Questão desatualizada',
  'Comentar / tirar dúvida',
];

// Lista curada — poderia virar `select distinct banca from questoes`,
// mantida estática por simplicidade/performance no MVP.
export const FILTER_BANCAS = ['FGV', 'Cebraspe', 'FCC', 'IBFC'];
