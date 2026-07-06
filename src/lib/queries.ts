import { supabase } from './supabase';
import type { Alternativa, ModuloQuestaoRow } from './database.types';
import type { Questao } from '../data/types';
import type { AiMessage } from '../state/types';

export interface TrilhaRow {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  ativa: boolean;
  ordem: number;
  secao_nome: string | null;
}

export async function fetchTrilhas(): Promise<TrilhaRow[]> {
  const { data, error } = await supabase.from('trilhas').select('*').order('ordem');
  if (error) throw error;
  return data ?? [];
}

export interface ModuloRow {
  id: number;
  trilha_id: number;
  titulo: string;
  ordem: number;
  tipo: 'questoes' | 'aula';
  video_url: string | null;
}

export async function fetchModulos(trilhaId: number): Promise<ModuloRow[]> {
  const { data, error } = await supabase.from('modulos').select('*').eq('trilha_id', trilhaId).order('ordem');
  if (error) throw error;
  return data ?? [];
}

export interface ModuloProgresso {
  acertos: number;
  total: number;
}

export async function fetchProgressoModulos(usuarioId: string, moduloIds: number[]): Promise<Map<number, ModuloProgresso>> {
  const map = new Map<number, ModuloProgresso>();
  if (!moduloIds.length) return map;
  const { data, error } = await supabase
    .from('progresso_modulos')
    .select('modulo_id, acertos, total')
    .eq('usuario_id', usuarioId)
    .in('modulo_id', moduloIds);
  if (error) throw error;
  for (const row of data ?? []) map.set(row.modulo_id, { acertos: row.acertos, total: row.total });
  return map;
}

export async function upsertProgressoModulo(usuarioId: string, moduloId: number, acertos: number, total: number) {
  const { error } = await supabase
    .from('progresso_modulos')
    .upsert({ usuario_id: usuarioId, modulo_id: moduloId, acertos, total }, { onConflict: 'usuario_id,modulo_id' });
  if (error) throw error;
}

function mapQuestaoRow(row: ModuloQuestaoRow): Questao {
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
    alternativas: (row.alternativas ?? []).map((a: Alternativa) => ({ letra: a.letra, texto: a.texto, html: a.html ?? undefined, correta: a.correta })),
  };
}

// Conteúdo das questões escolhidas a dedo pelo admin para este módulo
// (via RPC — `questoes` em si só é legível por admin, ver migration 004).
export async function fetchQuestoesDoModulo(moduloId: number): Promise<Questao[]> {
  const { data, error } = await supabase.rpc('get_modulo_questoes', { p_modulo_id: moduloId });
  if (error) throw error;
  return (data ?? []).map(mapQuestaoRow);
}

// Tutor de IA: manda a questão atual (via edge function, que busca o
// conteúdo com service_role) + gabarito + se o aluno acertou como contexto.
export async function askTutorIA(input: {
  questaoId: string;
  duvida: string;
  historico: AiMessage[];
  alternativaSelecionada: string | null;
  acertou: boolean;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('tutor-ia', {
    body: {
      questao_id: input.questaoId,
      duvida: input.duvida,
      historico: input.historico,
      alternativa_selecionada: input.alternativaSelecionada,
      acertou: input.acertou,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.reply as string;
}

export async function recordResposta(usuarioId: string, questaoId: string, acertou: boolean) {
  const { error } = await supabase.from('progresso_questoes').insert({ usuario_id: usuarioId, questao_id: questaoId, acertou });
  if (error) throw error;
}

// ---- Caderno de erros (por trilha, com "responder de novo") ----

export async function fetchContagemErros(trilhaId: number): Promise<number> {
  const { data, error } = await supabase.rpc('contar_minhas_questoes_erradas', { p_trilha_id: trilhaId });
  if (error) throw error;
  return data ?? 0;
}

export async function fetchQuestoesErradas(trilhaId: number): Promise<Questao[]> {
  const { data, error } = await supabase.rpc('get_minhas_questoes_erradas', { p_trilha_id: trilhaId });
  if (error) throw error;
  return (data ?? []).map(mapQuestaoRow);
}

// "Responder de novo": atualiza a mesma linha (upsert, não insert — já existe
// desde a primeira resposta), então se acertar desta vez ela some do caderno.
export async function atualizarRespostaErro(usuarioId: string, questaoId: string, acertou: boolean) {
  const { error } = await supabase
    .from('progresso_questoes')
    .upsert({ usuario_id: usuarioId, questao_id: questaoId, acertou, respondido_em: new Date().toISOString() }, { onConflict: 'usuario_id,questao_id' });
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
  const [respostasResult, porDisciplinaResult] = await Promise.all([
    supabase.from('progresso_questoes').select('acertou, respondido_em').eq('usuario_id', usuarioId),
    supabase.rpc('get_meu_desempenho_por_disciplina'),
  ]);
  if (respostasResult.error) throw respostasResult.error;
  if (porDisciplinaResult.error) throw porDisciplinaResult.error;
  const rows = respostasResult.data ?? [];

  const totalRespondidas = rows.length;
  const taxaAcerto = totalRespondidas ? Math.round((rows.filter((r) => r.acertou).length / totalRespondidas) * 100) : 0;

  const today = new Date();
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    const key = day.toISOString().slice(0, 10);
    return rows.filter((r) => r.respondido_em.slice(0, 10) === key).length;
  });

  const porDisciplina = (porDisciplinaResult.data ?? []).map((d) => ({
    disciplina: d.disciplina,
    pct: d.total ? Math.round((d.acertos / d.total) * 100) : 0,
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
