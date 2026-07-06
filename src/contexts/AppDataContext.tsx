import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useUsuario, type Usuario } from '../hooks/useUsuario';
import {
  fetchContagemErros,
  fetchDailyDone,
  fetchModulos,
  fetchProgressoModulos,
  fetchTrilhas,
  type ModuloRow,
  type TrilhaRow,
} from '../lib/queries';
import type { Database } from '../lib/database.types';
import type { Modulo, ModuloStatus } from '../data/types';
import { logClientError } from '../lib/errorLog';

type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

function computeModules(modulos: ModuloRow[], progresso: Map<number, { acertos: number; total: number }>): Modulo[] {
  let foundCurrent = false;
  return modulos.map((m) => {
    if (m.tipo === 'aula') {
      // Aula é sempre opcional: não entra na sequência obrigatória de questões
      // (não bloqueia nem é bloqueada pelo restante da trilha).
      return { id: m.id, titulo: m.titulo, ordem: m.ordem, tipo: m.tipo, video_url: m.video_url, status: 'aula' as ModuloStatus, acertos: 0, total: 0 };
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
    };
  });
}

interface AppDataContextValue {
  loading: boolean;
  loadError: string | null;
  retry: () => void;
  usuario: Usuario | null;
  updateUsuario: (patch: UsuarioUpdate) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  trilhas: TrilhaRow[];
  activeTrilha: TrilhaRow | null;
  setActiveTrilha: (id: number) => Promise<void>;
  modules: Modulo[];
  refreshModules: () => Promise<void>;
  dailyDone: number;
  refreshDailyDone: () => Promise<void>;
  errosCount: number;
  refreshErrosCount: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const LOAD_ERROR_MESSAGE = 'Não conseguimos carregar seus dados agora. Verifique sua conexão e tente de novo.';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { usuario, loading: loadingUsuario, updateUsuario, addXp } = useUsuario();
  const [trilhas, setTrilhas] = useState<TrilhaRow[]>([]);
  const [modules, setModules] = useState<Modulo[]>([]);
  const [dailyDone, setDailyDone] = useState(0);
  const [errosCount, setErrosCount] = useState(0);
  const [loadingTrilhas, setLoadingTrilhas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

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

  const activeTrilha = trilhas.find((t) => t.id === usuario?.trilha_ativa_id) ?? trilhas.find((t) => t.ativa) ?? trilhas[0] ?? null;

  const refreshModules = useCallback(async () => {
    if (!usuario || !activeTrilha) return;
    try {
      const modulos = await fetchModulos(activeTrilha.id);
      const progresso = await fetchProgressoModulos(
        usuario.id,
        modulos.map((m) => m.id)
      );
      setModules(computeModules(modulos, progresso));
      setLoadError(null);
    } catch (err) {
      logClientError(err, 'refreshModules');
      setLoadError(LOAD_ERROR_MESSAGE);
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

  const refreshErrosCount = useCallback(async () => {
    if (!activeTrilha) return;
    try {
      setErrosCount(await fetchContagemErros(activeTrilha.id));
    } catch (err) {
      logClientError(err, 'refreshErrosCount');
    }
  }, [activeTrilha]);

  useEffect(() => {
    refreshErrosCount();
  }, [refreshErrosCount]);

  const setActiveTrilha = useCallback(
    async (id: number) => {
      await updateUsuario({ trilha_ativa_id: id });
    },
    [updateUsuario]
  );

  const retry = useCallback(() => setRetryTick((t) => t + 1), []);

  return (
    <AppDataContext.Provider
      value={{
        loading: loadingUsuario || loadingTrilhas,
        loadError,
        retry,
        usuario,
        updateUsuario,
        addXp,
        trilhas,
        activeTrilha,
        setActiveTrilha,
        modules,
        refreshModules,
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
