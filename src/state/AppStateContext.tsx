import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { reducer } from './reducer';
import { initialAppState, type Action, type AppState } from './types';

interface AppStateContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  navWithLoading: (path: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialAppState);
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.timerOn) return;
    const id = setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000);
    return () => clearInterval(id);
  }, [state.timerOn]);

  function navWithLoading(path: string) {
    if (state.navLoading) return;
    dispatch({ type: 'SET_NAV_LOADING', loading: true });
    setTimeout(() => {
      navigate(path);
      dispatch({ type: 'SET_NAV_LOADING', loading: false });
    }, 320);
  }

  return <AppStateContext.Provider value={{ state, dispatch, navWithLoading }}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
