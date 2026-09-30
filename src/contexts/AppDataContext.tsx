import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useUsuario, type Usuario } from '../hooks/useUsuario';
import {
  fetchContagemErros,
  fetchDailyDone,
  fetchModulos,
  fetchProgressoModulos,
  fetchProgressoTrilhaInteligente,
  fetchSecoes,
  fetchTrilhas,
  type ModuloRow,
  type RespostaServidor,
  type SecaoRow,
  type TrilhaRow,
} from '../lib/queries';
import type { Database } from '../lib/database.types';
import type { EtapaProgresso, Modulo, ModuloStatus } from '../data/types';
import { logClientError } from '../lib/errorLog';
import { diaLocal, diaLocalDeslocado } from '../lib/datas';

type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

function computeModules(
  modulos: ModuloRow[],
  progresso: Map<number, { acertos: number; total: number }>,
  etapas: Map<number, EtapaProgresso>,
): Omit<Modulo, 'premium'>[] {
  let foundCurrent = false;
  return modulos.map((m) => {
    if (m.tipo === 'aula') {
      // Aula é sempre opcional: não entra na sequência obrigatória de questões
      // (não bloqueia nem é bloqueada pelo restante da trilha).
      return {
        id: m.id,
        titulo: m.titulo,
        ordem: m.ordem,
        tipo: m.tipo,
        video_url: m.video_url,
        status: 'aula' as ModuloStatus,
        acertos: 0,
        total: 0,
      };
    }
    const prog = progresso.get(m.id);
    let status: ModuloStatus;
    if (prog) status = 'done';
    else if (!foundCurrent) {
      status = 'current';
      foundCurrent = true;
    } else {
      status = 'locked';
    }
    return {
      id: m.id,
      titulo: m.titulo,
      ordem: m.ordem,
      tipo: m.tipo,
      video_url: m.video_url,
      status,
      acertos: prog?.acertos ?? 0,
      total: prog?.total ?? 0,
      // unidade de trilha inteligente: lições feitas (migration 030)
      etapa: etapas.get(m.id),
      secaoId: m.secao_id,
    };
  });
}

interface AppDataContextValue {
  loading: boolean;
  loadError: string | null;
  retry: () => void;
  usuario: Usuario | null;
  updateUsuario: (patch: UsuarioUpdate) => Promise<void>;
  // Reflete na tela o XP/ofensiva que o servidor devolveu ao responder.
  aplicarResposta: (r: RespostaServidor) => void;
  trilhas: TrilhaRow[];
  activeTrilha: TrilhaRow | null;
  setActiveTrilha: (id: number) => Promise<void>;
  modules: Modulo[];
  // Seções da trilha inteligente (vazio nas trilhas manuais).
  secoes: SecaoRow[];
  refreshModules: () => Promise<void>;
  // Assinatura ativa (cortesia ou paga) ou equipe — libera todos os módulos.
  temAcesso: boolean;
  refreshUsuario: () => Promise<void>;
  // Ofensiva (dias seguidos estudando): a efetiva já vem zerada se o aluno
  // pulou um dia. Quem estende é o servidor, ao responder (responder_questao).
  ofensiva: number;
  estudouHoje: boolean;
  dailyDone: number;
  refreshDailyDone: () => Promise<void>;
  errosCount: number;
  refreshErrosCount: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const LOAD_ERROR_MESSAGE = 'Não conseguimos carregar seus dados agora. Verifique sua conexão e tente de novo.';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { usuario, loading: loadingUsuario, updateUsuario, aplicarDoServidor, recarregarUsuario } = useUsuario();
  const [trilhas, setTrilhas] = useState<TrilhaRow[]>([]);
  const [baseModules, setModules] = useState<Omit<Modulo, 'premium'>[]>([]);
  const [secoes, setSecoes] = useState<SecaoRow[]>([]);
  const [dailyDone, setDailyDone] = useState(0);
  const [errosCount, setErrosCount] = useState(0);
  const [loadingTrilhas, setLoadingTrilhas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [modulesFor, setModulesFor] = useState('');
  const moduleRequest = useRef(0);

  useEffect(() => {
    setLoadingTrilhas(true);
    fetchTrilhas()
      .then((rows) => {
        setTrilhas(rows);
        setLoadError(null);
      })
      .catch((err) => {
        logClientError(err, 'fetchTrilhas');
        setLoadError(LOAD_ERROR_MESSAGE);
      })
      .finally(() => setLoadingTrilhas(false));
  }, [retryTick]);

  const activeTrilha =
    trilhas.find((t) => t.id === usuario?.trilha_ativa_id) ?? trilhas.find((t) => t.ativa) ?? trilhas[0] ?? null;

  const refreshModules = useCallback(async () => {
    if (!usuario || !activeTrilha) return;
    const request = ++moduleRequest.current;
    const scope = `${usuario.id}:${activeTrilha.id}`;
    try {
      const inteligente = activeTrilha.tipo === 'inteligente';
      const [modulosDb, secoesDb] = await Promise.all([
        fetchModulos(activeTrilha.id),
        inteligente ? fetchSecoes(activeTrilha.id) : Promise.resolve([] as SecaoRow[]),
      ]);
      // Trilha inteligente: a sequência segue as seções (sem seção primeiro),
      // igual ao servidor (modulo_liberado, migration 030).
      const posSecao = new Map(secoesDb.map((sec, i) => [sec.id, i + 1]));
      const pos = (m: ModuloRow) => (m.secao_id != null ? (posSecao.get(m.secao_id) ?? 0) : 0);
      const modulos = inteligente ? [...modulosDb].sort((a, b) => pos(a) - pos(b) || a.ordem - b.ordem || a.id - b.id) : modulosDb;
      const [progresso, etapas] = await Promise.all([
        fetchProgressoModulos(
          usuario.id,
          modulos.map((m) => m.id),
        ),
        inteligente ? fetchProgressoTrilhaInteligente(activeTrilha.id) : Promise.resolve(new Map<number, EtapaProgresso>()),
      ]);
      if (request !== moduleRequest.current) return;
      setModules(computeModules(modulos, progresso, etapas));
      setSecoes(secoesDb);
      setLoadError(null);
    } catch (err) {
      if (request !== moduleRequest.current) return;
      logClientError(err, 'refreshModules');
      setLoadError(LOAD_ERROR_MESSAGE);
    } finally {
      if (request === moduleRequest.current) setModulesFor(scope);
    }
  }, [usuario, activeTrilha]);

  useEffect(() => {
    refreshModules();
  }, [refreshModules, retryTick]);

  const refreshDailyDone = useCallback(async () => {
    if (!usuario) return;
    try {
      setDailyDone(await fetchDailyDone(usuario.id));
    } catch (err) {
      logClientError(err, 'refreshDailyDone');
    }
  }, [usuario]);

  useEffect(() => {
    refreshDailyDone();
  }, [refreshDailyDone]);

  // Caderno: erros + revisões programadas vencidas, de todas as trilhas.
  const refreshErrosCount = useCallback(async () => {
    if (!usuario) return;
    try {
      setErrosCount(await fetchContagemErros());
    } catch (err) {
      logClientError(err, 'refreshErrosCount');
    }
  }, [usuario]);

  useEffect(() => {
    refreshErrosCount();
  }, [refreshErrosCount]);

  const setActiveTrilha = useCallback(
    async (id: number) => {
      await updateUsuario({ trilha_ativa_id: id });
    },
    [updateUsuario],
  );

  const retry = useCallback(() => setRetryTick((t) => t + 1), []);

  const hoje = diaLocal();
  const ontem = diaLocalDeslocado(-1);
  const estudouHoje = usuario?.ultimo_estudo === hoje;
  const ofensiva = usuario && (estudouHoje || usuario.ultimo_estudo === ontem) ? usuario.streak : 0;

  const aplicarResposta = useCallback(
    (r: RespostaServidor) => aplicarDoServidor({ xp: r.xp, streak: r.streak, ultimo_estudo: r.ultimo_estudo }),
    [aplicarDoServidor],
  );

  // Mesma regra de modulo_liberado() no banco (migration 022): sem
  // assinatura, só o 1º módulo de questões da trilha é grátis.
  const temAcesso = useMemo(
    () =>
      !!usuario &&
      (usuario.assinatura_cortesia ||
        (!!usuario.acesso_ate && new Date(usuario.acesso_ate) > new Date()) ||
        usuario.is_admin ||
        usuario.is_editor),
    [usuario],
  );
  const modules = useMemo<Modulo[]>(() => {
    const gratisId = baseModules.find((m) => m.tipo === 'questoes' || m.tipo === 'inteligente')?.id;
    return baseModules.map((m) => ({ ...m, premium: !temAcesso && m.id !== gratisId }));
  }, [baseModules, temAcesso]);

  // Volta pro app (ex.: depois de pagar a fatura no Asaas): relê o usuário
  // pra liberar o acesso assim que o webhook confirmar o pagamento.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') recarregarUsuario();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [recarregarUsuario]);

  return (
    <AppDataContext.Provider
      value={{
        loading:
          loadingUsuario || loadingTrilhas || !!(usuario && activeTrilha && modulesFor !== `${usuario.id}:${activeTrilha.id}`),
        loadError,
        retry,
        usuario,
        updateUsuario,
        aplicarResposta,
        trilhas,
        activeTrilha,
        setActiveTrilha,
        modules,
        secoes,
        refreshModules,
        temAcesso,
        refreshUsuario: recarregarUsuario,
        ofensiva,
        estudouHoje,
        dailyDone,
        refreshDailyDone,
        errosCount,
        refreshErrosCount,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
