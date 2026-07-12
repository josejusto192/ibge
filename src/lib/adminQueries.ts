import { supabase } from './supabase';
import type { QuestaoRow } from './database.types';
import type { ModuloRow, TrilhaRow } from './queries';
import type { Usuario } from '../hooks/useUsuario';

// ---- Trilhas ----

export async function createTrilha(input: { nome: string; slug: string; descricao: string; ativa: boolean; ordem: number }) {
  const { data, error } = await supabase.from('trilhas').insert(input).select().single();
  if (error) throw error;
  return data as TrilhaRow;
}

export async function updateTrilha(
  id: number,
  patch: Partial<{ nome: string; slug: string; descricao: string | null; ativa: boolean; ordem: number; secao_nome: string | null }>
) {
  const { error } = await supabase.from('trilhas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteTrilha(id: number) {
  const { error } = await supabase.from('trilhas').delete().eq('id', id);
  if (error) throw error;
}

// ---- Módulos ----

export async function createModulo(
  trilhaId: number,
  input: { titulo: string; ordem: number; tipo?: 'questoes' | 'aula'; video_url?: string | null }
) {
  const { data, error } = await supabase.from('modulos').insert({ trilha_id: trilhaId, ...input }).select().single();
  if (error) throw error;
  return data as ModuloRow;
}

export async function updateModulo(
  id: number,
  patch: Partial<{ titulo: string; ordem: number; tipo: 'questoes' | 'aula'; video_url: string | null }>
) {
  const { error } = await supabase.from('modulos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function fetchModulo(id: number): Promise<ModuloRow> {
  const { data, error } = await supabase.from('modulos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function deleteModulo(id: number) {
  const { error } = await supabase.from('modulos').delete().eq('id', id);
  if (error) throw error;
}

// ---- Curadoria de questões por módulo ----

export interface ModuloQuestaoAdminRow {
  ordem: number;
  questao: QuestaoRow;
}

export async function fetchModuloQuestoesAdmin(moduloId: number): Promise<ModuloQuestaoAdminRow[]> {
  const { data, error } = await supabase
    .from('modulo_questoes')
    .select('ordem, questao:questoes(*)')
    .eq('modulo_id', moduloId)
    .order('ordem');
  if (error) throw error;
  return (data ?? []).map((row) => ({ ordem: row.ordem, questao: row.questao as unknown as QuestaoRow }));
}

export async function addQuestaoToModulo(moduloId: number, questaoId: string, ordem: number) {
  const { error } = await supabase.from('modulo_questoes').insert({ modulo_id: moduloId, questao_id: questaoId, ordem });
  if (error) throw error;
}

export async function removeQuestaoFromModulo(moduloId: number, questaoId: string) {
  const { error } = await supabase.from('modulo_questoes').delete().eq('modulo_id', moduloId).eq('questao_id', questaoId);
  if (error) throw error;
}

export async function reorderModuloQuestoes(moduloId: number, orderedQuestaoIds: string[]) {
  await Promise.all(
    orderedQuestaoIds.map((questaoId, index) =>
      supabase.from('modulo_questoes').update({ ordem: index }).eq('modulo_id', moduloId).eq('questao_id', questaoId)
    )
  );
}

// ---- Banco de questões (busca para curadoria) ----

export interface QuestaoSearchFilters {
  texto?: string;
  disciplina?: string;
  banca?: string;
  cargo?: string;
  nivel_escolaridade?: string;
  orgao?: string;
  assunto?: string;
  apenas?: 'todas' | 'revisadas' | 'nao_revisadas';
}

const PAGE_SIZE = 20;

export async function searchQuestoes(filters: QuestaoSearchFilters, page: number): Promise<{ rows: QuestaoRow[]; total: number }> {
  let query = supabase.from('questoes').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (filters.texto) query = query.ilike('enunciado', `%${filters.texto}%`);
  if (filters.disciplina) query = query.eq('disciplina', filters.disciplina);
  if (filters.banca) query = query.eq('banca', filters.banca);
  if (filters.cargo) query = query.eq('cargo', filters.cargo);
  if (filters.nivel_escolaridade) query = query.eq('nivel_escolaridade', filters.nivel_escolaridade);
  if (filters.orgao) query = query.eq('orgao', filters.orgao);
  if (filters.assunto) query = query.ilike('assunto', `%${filters.assunto}%`);
  if (filters.apenas === 'revisadas') query = query.eq('revisado', true);
  if (filters.apenas === 'nao_revisadas') query = query.eq('revisado', false);

  const { data, error, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

// Próxima questão não revisada (pro botão "Salvar e revisar próxima" —
// mesma ordenação da lista, ignorando a questão atual).
export async function fetchProximaNaoRevisada(excluirId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('questoes')
    .select('id')
    .eq('revisado', false)
    .neq('id', excluirId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Resolve quem revisou (via RPC — editor não lê usuarios direto).
export async function fetchNomesUsuarios(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return map;
  const { data, error } = await supabase.rpc('admin_nomes_usuarios', { p_ids: unicos });
  if (error) throw error;
  for (const row of data ?? []) map.set(row.id, row.nome);
  return map;
}

export interface FiltrosQuestoes {
  bancas: string[];
  disciplinas: string[];
  cargos: string[];
  niveis: string[];
  orgaos: string[];
}

export async function fetchFiltrosQuestoes(): Promise<FiltrosQuestoes> {
  const { data, error } = await supabase.rpc('admin_filtros_questoes').maybeSingle();
  if (error) throw error;
  return {
    bancas: data?.bancas ?? [],
    disciplinas: data?.disciplinas ?? [],
    cargos: data?.cargos ?? [],
    niveis: data?.niveis ?? [],
    orgaos: data?.orgaos ?? [],
  };
}

export async function fetchQuestaoAdmin(id: string): Promise<QuestaoRow> {
  const { data, error } = await supabase.from('questoes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// ---- Revisão de comentário ----

export async function reviewWithAI(questaoId: string): Promise<{ comentario_revisado_html: string; comentario_revisado: string }> {
  const { data, error } = await supabase.functions.invoke('revisar-comentario', { body: { questao_id: questaoId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function saveManualReview(questaoId: string, usuarioId: string, comentarioRevisadoHtml: string) {
  const plainText = comentarioRevisadoHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const { error } = await supabase
    .from('questoes')
    .update({
      comentario_revisado_html: comentarioRevisadoHtml,
      comentario_revisado: plainText,
      revisado: true,
      revisado_em: new Date().toISOString(),
      revisado_metodo: 'manual',
      revisado_por: usuarioId,
    })
    .eq('id', questaoId);
  if (error) throw error;
}

export async function unmarkRevisado(questaoId: string) {
  const { error } = await supabase.from('questoes').update({ revisado: false }).eq('id', questaoId);
  if (error) throw error;
}

// ---- Usuários ----

const USUARIOS_PAGE_SIZE = 20;

export async function searchUsuarios(texto: string | undefined, page: number): Promise<{ rows: Usuario[]; total: number }> {
  let query = supabase.from('usuarios').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (texto) query = query.or(`nome.ilike.%${texto}%,email.ilike.%${texto}%`);

  const { data, error, count } = await query.range(page * USUARIOS_PAGE_SIZE, page * USUARIOS_PAGE_SIZE + USUARIOS_PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function updateUsuarioAdmin(id: string, patch: Partial<Pick<Usuario, 'assinatura_ativa' | 'is_admin' | 'is_editor'>>) {
  const { error } = await supabase.from('usuarios').update(patch).eq('id', id);
  if (error) throw error;
}

// ---- Configurações de IA ----

export const GEMINI_MODELOS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

// A api_key nunca é lida de volta pro navegador (nem pelo admin) — só a
// Edge Function, com service_role, a lê de fato. A tela de configurações só
// sabe se JÁ existe uma chave configurada (api_key_configurada).
export interface ConfiguracoesIA {
  modelo: string;
  prompt_extra: string | null;
  tutor_prompt_extra: string | null;
  tutor_limite_diario: number;
  api_key_configurada: boolean;
  atualizado_em: string;
}

export interface ConfiguracoesIAPatch {
  modelo?: string;
  api_key?: string;
  prompt_extra?: string | null;
  tutor_prompt_extra?: string | null;
  tutor_limite_diario?: number;
}

export async function fetchConfiguracoesIA(): Promise<ConfiguracoesIA> {
  const { data, error } = await supabase.rpc('admin_get_configuracoes_ia').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Configurações de IA não encontradas.');
  return data;
}

export async function updateConfiguracoesIA(patch: ConfiguracoesIAPatch) {
  const { error } = await supabase
    .from('configuracoes_ia')
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
}

// ---- Dashboard ----

export interface DashboardStats {
  total_questoes: number;
  questoes_revisadas: number;
  total_alunos: number | null;
  alunos_ativos_hoje: number | null;
  erros_7d: number | null;
  tutor_usos_hoje: number | null;
}

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  const { data, error } = await supabase.rpc('admin_dashboard_stats').maybeSingle();
  if (error) throw error;
  return data;
}

export interface DashboardTrilha {
  id: number;
  nome: string;
  ativa: boolean;
  modulos: number;
  modulos_sem_questoes: number;
  questoes: number;
}

export async function fetchDashboardTrilhas(): Promise<DashboardTrilha[]> {
  const { data, error } = await supabase.rpc('admin_dashboard_trilhas');
  if (error) throw error;
  return data ?? [];
}

// Contagem de questões por módulo (pra lista de módulos de uma trilha).
export async function fetchContagemQuestoesPorModulo(moduloIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!moduloIds.length) return map;
  const { data, error } = await supabase.from('modulo_questoes').select('modulo_id').in('modulo_id', moduloIds).limit(10000);
  if (error) throw error;
  for (const row of data ?? []) map.set(row.modulo_id, (map.get(row.modulo_id) ?? 0) + 1);
  return map;
}

// ---- Erros de cliente (monitoramento leve, sem Sentry) ----

export interface ClientErrorRow {
  id: number;
  usuario_id: string | null;
  mensagem: string;
  stack: string | null;
  contexto: string | null;
  url: string | null;
  user_agent: string | null;
  criado_em: string;
}

const ERROS_PAGE_SIZE = 30;

export async function fetchClientErrors(page: number): Promise<{ rows: ClientErrorRow[]; total: number }> {
  const { data, error, count } = await supabase
    .from('client_errors')
    .select('*', { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(page * ERROS_PAGE_SIZE, page * ERROS_PAGE_SIZE + ERROS_PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
