import { supabase } from './supabase';
import type { Alternativa } from './database.types';
import type { Questao } from '../data/types';

export interface TrilhaRow {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  ativa: boolean;
  ordem: number;
}

export async function fetchTrilhas(): Promise<TrilhaRow[]> {
  const { data, error } = await supabase.from('trilhas').select('*').order('ordem');
  if (error) throw error;
  return data ?? [];
}

export interface DisciplinaRow {
  disciplina: string;
  ordem: number;
}

export async function fetchTrilhaDisciplinas(trilhaId: number): Promise<DisciplinaRow[]> {
  const { data, error } = await supabase
    .from('trilha_disciplinas')
    .select('disciplina, ordem')
    .eq('trilha_id', trilhaId)
    .order('ordem');
  if (error) throw error;
  return data ?? [];
}

export interface ModuloProgresso {
  acertos: number;
  total: number;
}

export async function fetchProgressoModulos(usuarioId: string, trilhaId: number): Promise<Map<string, ModuloProgresso>> {
  const { data, error } = await supabase
    .from('progresso_modulos')
    .select('disciplina, acertos, total')
    .eq('usuario_id', usuarioId)
    .eq('trilha_id', trilhaId);
  if (error) throw error;
  const map = new Map<string, ModuloProgresso>();
  for (const row of data ?? []) map.set(row.disciplina, { acertos: row.acertos, total: row.total });
  return map;
}

export async function upsertProgressoModulo(usuarioId: string, trilhaId: number, disciplina: string, acertos: number, total: number) {
  const { error } = await supabase
    .from('progresso_modulos')
    .upsert({ usuario_id: usuarioId, trilha_id: trilhaId, disciplina, acertos, total }, { onConflict: 'usuario_id,trilha_id,disciplina' });
  if (error) throw error;
}

// Cada "módulo" é uma rodada de N questões da disciplina. Para manter o MVP
// simples, a seleção é determinística (ordenada por id) em vez de aleatória —
// dá pra evoluir para excluir questões já respondidas / randomizar depois.
const QUESTOES_POR_MODULO = 8;

function mapQuestaoRow(row: {
  id: string;
  enunciado: string | null;
  enunciado_html: string | null;
  tem_imagem: boolean;
  gabarito_letra: string | null;
  comentario: string | null;
  comentario_html: string | null;
  banca: string | null;
  ano: number | null;
  orgao: string | null;
  orgao_nome: string | null;
  cargo: string | null;
  disciplina: string;
  nivel_escolaridade: string | null;
  tipo: string | null;
  anulada: boolean;
  desatualizada: boolean;
  alternativas: Alternativa[];
}): Questao {
  return {
    id: row.id,
    enunciado: row.enunciado ?? '',
    enunciado_html: row.enunciado_html ?? undefined,
    tem_imagem: row.tem_imagem,
    gabarito_letra: row.gabarito_letra ?? '',
    comentario: row.comentario ?? '',
    comentario_html: row.comentario_html ?? undefined,
    banca: row.banca ?? '',
    ano: row.ano ?? 0,
    orgao: row.orgao ?? undefined,
    orgao_nome: row.orgao_nome ?? undefined,
    cargo: row.cargo ?? undefined,
    disciplina: row.disciplina,
    nivel_escolaridade: row.nivel_escolaridade ?? undefined,
    tipo: row.tipo ?? undefined,
    anulada: row.anulada,
    desatualizada: row.desatualizada,
    alternativas: (row.alternativas ?? []).map((a) => ({ letra: a.letra, texto: a.texto, html: a.html ?? undefined, correta: a.correta })),
  };
}

export async function fetchQuestoesPorDisciplina(disciplina: string, banca: string | null): Promise<Questao[]> {
  let query = supabase
    .from('questoes')
    .select(
      'id, enunciado, enunciado_html, tem_imagem, gabarito_letra, comentario, comentario_html, banca, ano, orgao, orgao_nome, cargo, disciplina, nivel_escolaridade, tipo, anulada, desatualizada, alternativas'
    )
    .eq('disciplina', disciplina)
    .eq('anulada', false)
    .order('id')
    .limit(QUESTOES_POR_MODULO);
  if (banca) query = query.eq('banca', banca);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapQuestaoRow);
}

export async function recordResposta(usuarioId: string, questaoId: string, acertou: boolean) {
  const { error } = await supabase.from('progresso_questoes').insert({ usuario_id: usuarioId, questao_id: questaoId, acertou });
  if (error) throw error;
}

export async function fetchDailyDone(usuarioId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('progresso_questoes')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .gte('respondido_em', startOfDay.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export interface StatsData {
  totalRespondidas: number;
  taxaAcerto: number;
  ultimos7Dias: number[];
  porDisciplina: { disciplina: string; pct: number }[];
}

export async function fetchStats(usuarioId: string): Promise<StatsData> {
  const { data, error } = await supabase
    .from('progresso_questoes')
    .select('acertou, respondido_em, questoes(disciplina)')
    .eq('usuario_id', usuarioId);
  if (error) throw error;
  const rows = data ?? [];

  const totalRespondidas = rows.length;
  const taxaAcerto = totalRespondidas ? Math.round((rows.filter((r) => r.acertou).length / totalRespondidas) * 100) : 0;

  const today = new Date();
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const key = day.toISOString().slice(0, 10);
    return rows.filter((r) => r.respondido_em.slice(0, 10) === key).length;
  });

  const byDisciplina = new Map<string, { acertos: number; total: number }>();
  for (const r of rows) {
    const disciplina = (r.questoes as unknown as { disciplina: string } | null)?.disciplina;
    if (!disciplina) continue;
    const entry = byDisciplina.get(disciplina) ?? { acertos: 0, total: 0 };
    entry.total += 1;
    if (r.acertou) entry.acertos += 1;
    byDisciplina.set(disciplina, entry);
  }
  const porDisciplina = Array.from(byDisciplina.entries()).map(([disciplina, { acertos, total }]) => ({
    disciplina,
    pct: total ? Math.round((acertos / total) * 100) : 0,
  }));

  return { totalRespondidas, taxaAcerto, ultimos7Dias, porDisciplina };
}

export interface RankingRow {
  id: string;
  nome: string;
  xp: number;
  streak: number;
}

export async function fetchRanking(): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc('get_ranking', { p_limit: 50 });
  if (error) throw error;
  return data ?? [];
}

// Código exibido ao usuário é "FOCO-XXXXXXXX" (prefixo de exibição + os 8
// primeiros caracteres do uuid, ver resolveReferralCode/referralCodeFor).
export function referralCodeFor(usuarioId: string): string {
  return `FOCO-${usuarioId.slice(0, 8).toUpperCase()}`;
}

export async function resolveReferralCode(code: string): Promise<string | null> {
  const suffix = code.replace(/^FOCO-/i, '');
  const { data, error } = await supabase.rpc('resolve_referral_code', { p_code: suffix });
  if (error) throw error;
  return data ?? null;
}

export interface ReferralRow {
  id: string;
  indicado_nome: string | null;
  status: 'pendente' | 'assinou';
  criado_em: string;
}

export async function fetchReferrals(usuarioId: string): Promise<ReferralRow[]> {
  const { data, error } = await supabase
    .from('indicacoes')
    .select('id, status, criado_em, indicado_user_id')
    .eq('indicador_id', usuarioId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  const ids = rows.map((r) => r.indicado_user_id).filter((id): id is string => !!id);
  const nomes = new Map<string, string | null>();
  if (ids.length) {
    const { data: usuariosData } = await supabase.from('usuarios').select('id, nome').in('id', ids);
    for (const u of usuariosData ?? []) nomes.set(u.id, u.nome);
  }

  return rows.map((r) => ({
    id: r.id,
    indicado_nome: r.indicado_user_id ? nomes.get(r.indicado_user_id) ?? null : null,
    status: r.status,
    criado_em: r.criado_em,
  }));
}

export async function registerReferral(indicadorId: string, indicadoUserId: string) {
  const { error } = await supabase.from('indicacoes').insert({ indicador_id: indicadorId, indicado_user_id: indicadoUserId });
  if (error) throw error;
}
