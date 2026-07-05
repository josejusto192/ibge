import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useUsuario, type Usuario } from '../hooks/useUsuario';
import { fetchDailyDone, fetchModulos, fetchProgressoModulos, fetchTrilhas, type ModuloRow, type TrilhaRow } from '../lib/queries';
import type { Database } from '../lib/database.types';
import type { Modulo, ModuloStatus } from '../data/types';

type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

function computeModules(modulos: ModuloRow[], progresso: Map<number, { acertos: number; total: number }>): Modulo[] {
  let foundCurrent = false;
  return modulos.map((m) => {
    const prog = progresso.get(m.id);
    let status: ModuloStatus;
    if (prog) status = 'done';
    else if (!foundCurrent) {
      status = 'current';
      foundCurrent = true;
    } else {
      status = 'locked';
    }
    return { id: m.id, titulo: m.titulo, ordem: m.ordem, status, acertos: prog?.acertos ?? 0, total: prog?.total ?? 0 };
  });
}

interface AppDataContextValue {
  loading: boolean;
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
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { usuario, loading: loadingUsuario, updateUsuario, addXp } = useUsuario();
  const [trilhas, setTrilhas] = useState<TrilhaRow[]>([]);
  const [modules, setModules] = useState<Modulo[]>([]);
  const [dailyDone, setDailyDone] = useState(0);
  const [loadingTrilhas, setLoadingTrilhas] = useState(true);

  useEffect(() => {
    fetchTrilhas()
      .then(setTrilhas)
      .finally(() => setLoadingTrilhas(false));
  }, []);

  const activeTrilha = trilhas.find((t) => t.id === usuario?.trilha_ativa_id) ?? trilhas.find((t) => t.ativa) ?? trilhas[0] ?? null;

  const refreshModules = useCallback(async () => {
    if (!usuario || !activeTrilha) return;
    const modulos = await fetchModulos(activeTrilha.id);
    const progresso = await fetchProgressoModulos(
      usuario.id,
      modulos.map((m) => m.id)
    );
    setModules(computeModules(modulos, progresso));
  }, [usuario, activeTrilha]);

  useEffect(() => {
    refreshModules();
  }, [refreshModules]);

  const refreshDailyDone = useCallback(async () => {
    if (!usuario) return;
    setDailyDone(await fetchDailyDone(usuario.id));
  }, [usuario]);

  useEffect(() => {
    refreshDailyDone();
  }, [refreshDailyDone]);

  const setActiveTrilha = useCallback(
    async (id: number) => {
      await updateUsuario({ trilha_ativa_id: id });
    },
    [updateUsuario]
  );

  return (
    <AppDataContext.Provider
      value={{
        loading: loadingUsuario || loadingTrilhas,
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
