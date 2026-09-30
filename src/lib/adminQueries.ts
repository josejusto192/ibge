import { supabase } from './supabase';
import { invokeEdgeFunction } from './edgeFunctions';
import type { Database, QuestaoRow, TrilhaConfigRow } from './database.types';
import type { ModuloRow, SecaoRow, TrilhaRow } from './queries';
import type { Usuario } from '../hooks/useUsuario';

// ---- Trilhas ----

export async function createTrilha(input: {
  nome: string;
  slug: string;
  descricao: string;
  ativa: boolean;
  ordem: number;
  tipo?: 'manual' | 'inteligente';
}) {
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
  input: {
    titulo: string;
    ordem: number;
    tipo?: 'questoes' | 'aula' | 'inteligente';
    video_url?: string | null;
    aula_id?: number | null;
    disciplina?: string | null;
    assuntos?: string[];
    meta_questoes?: number;
    dominio_alvo?: number;
    secao_id?: number | null;
    licoes?: number;
  }
) {
  const { data, error } = await supabase.from('modulos').insert({ trilha_id: trilhaId, ...input }).select().single();
  if (error) throw error;
  return data as ModuloRow;
}

export async function updateModulo(
  id: number,
  patch: Partial<{
    titulo: string;
    ordem: number;
    tipo: 'questoes' | 'aula' | 'inteligente';
    video_url: string | null;
    aula_id: number | null;
    disciplina: string | null;
    assuntos: string[];
    meta_questoes: number;
    dominio_alvo: number;
    secao_id: number | null;
    licoes: number;
  }>
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

// ---- Biblioteca de aulas ----

export interface AulaRow {
  id: number;
  titulo: string;
  descricao: string | null;
  video_url: string;
  criado_em: string;
}

export async function fetchAulas(): Promise<AulaRow[]> {
  const { data, error } = await supabase.from('aulas').select('*').order('titulo');
  if (error) throw error;
  return data ?? [];
}

export async function createAula(input: { titulo: string; video_url: string; descricao?: string | null }) {
  const { data, error } = await supabase.from('aulas').insert(input).select().single();
  if (error) throw error;
  return data as AulaRow;
}

export async function updateAula(id: number, patch: Partial<{ titulo: string; video_url: string; descricao: string | null }>) {
  const { error } = await supabase.from('aulas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAula(id: number) {
  const { error } = await supabase.from('aulas').delete().eq('id', id);
  // FK restrict em modulos.aula_id (migration 019).
  if (error?.code === '23503') throw new Error('Esta aula está em uso em uma trilha — remova-a dos módulos antes de excluir.');
  if (error) throw error;
}

// Quantos módulos e questões usam cada aula (pra lista da biblioteca).
export async function fetchUsoAulas(): Promise<Map<number, { modulos: number; questoes: number }>> {
  const map = new Map<number, { modulos: number; questoes: number }>();
  const [modulosResult, questoesResult] = await Promise.all([
    supabase.from('modulos').select('aula_id').not('aula_id', 'is', null).limit(10000),
    supabase.from('questoes').select('aula_id').not('aula_id', 'is', null).limit(10000),
  ]);
  if (modulosResult.error) throw modulosResult.error;
  if (questoesResult.error) throw questoesResult.error;
  const uso = (id: number) => map.get(id) ?? map.set(id, { modulos: 0, questoes: 0 }).get(id)!;
  for (const row of modulosResult.data ?? []) if (row.aula_id != null) uso(row.aula_id).modulos++;
  for (const row of questoesResult.data ?? []) if (row.aula_id != null) uso(row.aula_id).questoes++;
  return map;
}

export async function setAulaDaQuestao(questaoId: string, aulaId: number | null) {
  const { error } = await supabase.from('questoes').update({ aula_id: aulaId }).eq('id', questaoId);
  if (error) throw error;
}

// ---- Tickets (reportes de questão; suporte fica para depois do MVP) ----
// RLS: admin vê tudo; editor vê só os de questão (migration 025).

export type TicketAdminRow = Database['public']['Tables']['tickets']['Row'];
export type TicketStatus = TicketAdminRow['status'];

export async function fetchTickets(filtro: { status: 'abertos' | 'resolvidos' | 'todos'; tipo?: 'questao' | 'suporte' }): Promise<TicketAdminRow[]> {
  let query = supabase.from('tickets').select('*').order('criado_em', { ascending: false }).limit(200);
  if (filtro.status === 'abertos') query = query.in('status', ['aberto', 'em_andamento']);
  if (filtro.status === 'resolvidos') query = query.in('status', ['resolvido', 'fechado']);
  if (filtro.tipo) query = query.eq('tipo', filtro.tipo);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function atualizarTicket(id: number, patch: { status?: TicketStatus }) {
  const { error } = await supabase.from('tickets').update(patch).eq('id', id);
  if (error) throw error;
}

// E-mails de quem abriu (só admin lê usuarios; editor fica só com o nome).
export async function fetchEmailsUsuarios(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return map;
  const { data } = await supabase.from('usuarios').select('id, email').in('id', unicos);
  for (const row of data ?? []) map.set(row.id, row.email);
  return map;
}

// ---- Planos de assinatura (só admin — RLS de planos, migration 021) ----

export type PlanoAdminRow = Database['public']['Tables']['planos']['Row'];
export type PlanoInput = { nome: string; descricao: string | null; valor: number; ciclo: string; ativo: boolean; ordem: number };

export async function fetchPlanosAdmin(): Promise<PlanoAdminRow[]> {
  const { data, error } = await supabase.from('planos').select('*').order('ordem').order('id');
  if (error) throw error;
  return data ?? [];
}

export async function createPlano(input: PlanoInput) {
  const { error } = await supabase.from('planos').insert(input);
  if (error) throw error;
}

export async function updatePlano(id: number, patch: Partial<PlanoInput>) {
  const { error } = await supabase.from('planos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deletePlano(id: number) {
  const { error } = await supabase.from('planos').delete().eq('id', id);
  if (error) throw error;
}

// Assinaturas (qualquer status) e ativas por plano — plano com assinatura
// não é excluído, só desativado.
export async function fetchUsoPlanos(): Promise<Map<number, { total: number; ativas: number }>> {
  const map = new Map<number, { total: number; ativas: number }>();
  const { data, error } = await supabase.from('assinaturas').select('plano_id, status').not('plano_id', 'is', null).limit(10000);
  if (error) throw error;
  for (const row of data ?? []) {
    if (row.plano_id == null) continue;
    const uso = map.get(row.plano_id) ?? { total: 0, ativas: 0 };
    uso.total += 1;
    if (row.status === 'ACTIVE') uso.ativas += 1;
    map.set(row.plano_id, uso);
  }
  return map;
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
  ano?: number;
  tipo?: string;
  area?: string;
  imagem?: 'com' | 'sem';
  situacao?: 'regulares' | 'anuladas' | 'desatualizadas';
  apenas?: 'todas' | 'revisadas' | 'nao_revisadas';
  aula?: 'com' | 'sem';
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
  if (filters.ano) query = query.eq('ano', filters.ano);
  if (filters.tipo) query = query.ilike('tipo', `%${filters.tipo}%`);
  if (filters.area) query = query.ilike('area', `%${filters.area}%`);
  if (filters.imagem) query = query.eq('tem_imagem', filters.imagem === 'com');
  if (filters.situacao === 'regulares') query = query.eq('anulada', false).eq('desatualizada', false);
  if (filters.situacao === 'anuladas') query = query.eq('anulada', true);
  if (filters.situacao === 'desatualizadas') query = query.eq('desatualizada', true);
  if (filters.apenas === 'revisadas') query = query.eq('revisado', true);
  if (filters.apenas === 'nao_revisadas') query = query.eq('revisado', false);
  if (filters.aula === 'com') query = query.not('aula_id', 'is', null);
  if (filters.aula === 'sem') query = query.is('aula_id', null);

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
  // Admin vê a mensagem real da função (ex.: chave do Gemini inválida).
  return invokeEdgeFunction('revisar-comentario', { questao_id: questaoId });
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

  if (texto) {
    // vírgula e parênteses quebram o filtro do PostgREST
    const t = texto.replace(/[,()]/g, ' ').trim();
    const digitos = t.replace(/\D/g, '');
    query = query.or(
      [`nome.ilike.%${t}%`, `email.ilike.%${t}%`, `utm_campaign.ilike.%${t}%`, `utm_source.ilike.%${t}%`]
        .concat(digitos.length >= 4 ? [`whatsapp.ilike.%${digitos.slice(-8)}%`] : [])
        .join(','),
    );
  }

  const { data, error, count } = await query.range(page * USUARIOS_PAGE_SIZE, page * USUARIOS_PAGE_SIZE + USUARIOS_PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function updateUsuarioAdmin(id: string, patch: Partial<Pick<Usuario, 'assinatura_cortesia' | 'is_admin' | 'is_editor'>>) {
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
  tutor_limite_diario_gratis: number;
  api_key_configurada: boolean;
  atualizado_em: string;
}

export interface ConfiguracoesIAPatch {
  modelo?: string;
  api_key?: string;
  prompt_extra?: string | null;
  tutor_prompt_extra?: string | null;
  tutor_limite_diario?: number;
  tutor_limite_diario_gratis?: number;
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

// ---- Trilha inteligente (migration 028) ----

export type TrilhaConfig = Omit<TrilhaConfigRow, 'atualizado_em'>;

export const CONFIG_PADRAO = (trilhaId: number): TrilhaConfig => ({
  trilha_id: trilhaId,
  concurso: null,
  cargo_alvo: null,
  bancas: [],
  banca_alvo: null,
  banca_alvo_pct: 70,
  orgaos: [],
  cargos: [],
  niveis: [],
  ano_min: null,
  ano_max: null,
  apenas_certo_errado: false,
  permitir_nao_revisadas: false,
  questoes_por_sessao: 10,
  revisoes_por_sessao: 2,
});

export async function fetchTrilhaConfig(trilhaId: number): Promise<TrilhaConfig> {
  const { data, error } = await supabase.from('trilha_config').select('*').eq('trilha_id', trilhaId).maybeSingle();
  if (error) throw error;
  if (!data) return CONFIG_PADRAO(trilhaId);
  const { atualizado_em: _ignorado, ...config } = data;
  return config;
}

export async function saveTrilhaConfig(config: TrilhaConfig) {
  const { error } = await supabase.from('trilha_config').upsert({ ...config, atualizado_em: new Date().toISOString() });
  if (error) throw error;
}

export interface AssuntoEstoque {
  assunto: string;
  total: number;
  revisadas: number;
}

export async function fetchAssuntos(disciplina: string): Promise<AssuntoEstoque[]> {
  const { data, error } = await supabase.rpc('admin_assuntos', { p_disciplina: disciplina });
  if (error) throw error;
  return data ?? [];
}

export interface EstoqueContado {
  total: number;
  banca_alvo: number;
  nao_revisadas: number;
}

// Quantas questões entram numa etapa com os filtros salvos da trilha.
export async function contarEstoque(trilhaId: number, disciplina: string | null, assuntos: string[]): Promise<EstoqueContado> {
  const { data, error } = await supabase
    .rpc('admin_contar_estoque', { p_trilha_id: trilhaId, p_disciplina: disciplina ?? '', p_assuntos: assuntos })
    .maybeSingle();
  if (error) throw error;
  return data ?? { total: 0, banca_alvo: 0, nao_revisadas: 0 };
}

export interface EstoqueEtapa {
  total: number;
  banca_alvo: number;
  obrigatorias: number;
}

export async function fetchEstoqueTrilha(trilhaId: number): Promise<Map<number, EstoqueEtapa>> {
  const { data, error } = await supabase.rpc('admin_estoque_trilha', { p_trilha_id: trilhaId });
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.modulo_id, { total: r.total, banca_alvo: r.banca_alvo, obrigatorias: r.obrigatorias }]));
}

export interface RegraQuestao {
  questao_id: string;
  regra: 'obrigatoria' | 'excluida';
  modulo_id: number | null;
  questao: Pick<QuestaoRow, 'id' | 'enunciado' | 'banca' | 'ano' | 'disciplina' | 'assunto' | 'revisado'> | null;
}

export async function fetchRegrasTrilha(trilhaId: number): Promise<RegraQuestao[]> {
  const { data, error } = await supabase.from('trilha_questoes_regras').select('*').eq('trilha_id', trilhaId);
  if (error) throw error;
  const regras = data ?? [];
  if (!regras.length) return [];
  const { data: qs, error: qErr } = await supabase
    .from('questoes')
    .select('id, enunciado, banca, ano, disciplina, assunto, revisado')
    .in(
      'id',
      regras.map((r) => r.questao_id),
    );
  if (qErr) throw qErr;
  const porId = new Map((qs ?? []).map((q) => [q.id, q]));
  return regras.map((r) => ({ questao_id: r.questao_id, regra: r.regra, modulo_id: r.modulo_id, questao: porId.get(r.questao_id) ?? null }));
}

export async function salvarRegra(trilhaId: number, questaoId: string, regra: 'obrigatoria' | 'excluida', moduloId: number | null) {
  const { error } = await supabase
    .from('trilha_questoes_regras')
    .upsert({ trilha_id: trilhaId, questao_id: questaoId, regra, modulo_id: regra === 'obrigatoria' ? moduloId : null });
  if (error) throw error;
}

export async function removerRegra(trilhaId: number, questaoId: string) {
  const { error } = await supabase.from('trilha_questoes_regras').delete().eq('trilha_id', trilhaId).eq('questao_id', questaoId);
  if (error) throw error;
}

// ---- Trilha inteligente: seções e sugestão de estrutura (migration 030) ----

export async function createSecao(trilhaId: number, titulo: string, ordem: number): Promise<SecaoRow> {
  const { data, error } = await supabase.from('trilha_secoes').insert({ trilha_id: trilhaId, titulo, ordem }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSecao(id: number, patch: { titulo?: string; ordem?: number }) {
  const { error } = await supabase.from('trilha_secoes').update(patch).eq('id', id);
  if (error) throw error;
}

// As unidades da seção apagada ficam "sem seção" (não são apagadas).
export async function deleteSecao(id: number) {
  const { error } = await supabase.from('trilha_secoes').delete().eq('id', id);
  if (error) throw error;
}

export interface EstoqueAssunto {
  disciplina: string;
  assunto: string;
  estoque: number;
  banca_alvo: number;
}

// Estoque por disciplina/assunto com os filtros salvos da trilha.
export async function sugerirEstrutura(trilhaId: number): Promise<EstoqueAssunto[]> {
  const { data, error } = await supabase.rpc('admin_sugerir_estrutura', { p_trilha_id: trilhaId });
  if (error) throw error;
  return data ?? [];
}

// ---- Painel "Público" (migration 031) ----

export interface Publico {
  total: number;
  assinantes: number;
  ativos_7d: number;
  contagens: Array<{ campo: string; valor: string; total: number }>;
  metas: Array<{ meta: number; alunos: number; media_real: number; batem_meta: number }>;
  funil: Array<{ etapa: string; sessoes: number }>;
  origens?: Array<{ fonte: string; campanha: string; visitas: number; cadastros: number; assinantes: number }>;
}

export async function fetchPublico(dias: number): Promise<Publico> {
  const { data, error } = await supabase.rpc('admin_publico', { p_dias: dias });
  if (error) throw error;
  return data as unknown as Publico;
}

// ---- Ficha do aluno (migration 032) ----

export interface AlunoDetalhe {
  trilha: string | null;
  modulos_total: number;
  modulos_feitos: number;
  respostas: number;
  acertos: number;
  respostas_7d: number;
  respostas_30d: number;
  dias_estudo_30d: number;
  ultima_resposta: string | null;
  ultimos_14d: number[];
  por_disciplina: Array<{ disciplina: string; total: number; acertos: number }>;
  dominio: Array<{ disciplina: string; dominio: number; respostas: number }>;
  revisoes_pendentes: number;
  indicacoes: number;
  indicacoes_assinaram: number;
  indicado_por: string | null;
}

export async function fetchAlunoDetalhe(id: string): Promise<AlunoDetalhe> {
  const { data, error } = await supabase.rpc('admin_aluno_detalhe', { p_id: id });
  if (error) throw error;
  return data as unknown as AlunoDetalhe;
}
