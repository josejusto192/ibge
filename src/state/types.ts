// Estado efêmero de sessão/UI. Dados que persistem (xp, streak, trilha ativa,
// progresso por módulo, perfil) vivem no Supabase e são acessados via
// AppDataContext (src/contexts/AppDataContext.tsx), não aqui.

export interface OnboardingState {
  step: number;
  nome: string;
  email: string;
  whats: string;
  contactError: string | null;
  faixa: string | null;
  prestou: 'sim' | 'nao' | null;
  concurso: number | null;
  prazo: string | null;
  nivel: string | null;
  meta: number;
  commit: boolean;
  password: string;
  authError: string | null;
  submitting: boolean;
}

export interface QuestionSession {
  qIndex: number;
  selected: string | null;
  answered: boolean;
  sessionCorrect: number;
  sessionAnswered: number;
  gained: number;
}

// Só "banca" sobrevive como filtro de usuário: a disciplina já é o próprio
// módulo da trilha (sequencial), então não faz sentido como filtro solto.
export interface FiltersState {
  banca: string;
}

export interface AiMessage {
  role: 'user' | 'ai';
  text: string;
}

export interface AppState {
  ob: OnboardingState;
  filters: FiltersState;
  session: QuestionSession;
  timerOn: boolean;
  seconds: number;
  mentorOpen: boolean;
  navLoading: boolean;
  aiMessages: AiMessage[];
  aiTyping: boolean;
}

export const initialAppState: AppState = {
  ob: {
    step: 0,
    nome: '',
    email: '',
    whats: '',
    contactError: null,
    faixa: null,
    prestou: null,
    concurso: null,
    prazo: null,
    nivel: null,
    meta: 20,
    commit: false,
    password: '',
    authError: null,
    submitting: false,
  },
  filters: { banca: '' },
  session: { qIndex: 0, selected: null, answered: false, sessionCorrect: 0, sessionAnswered: 0, gained: 0 },
  timerOn: false,
  seconds: 1500,
  mentorOpen: false,
  navLoading: false,
  aiMessages: [],
  aiTyping: false,
};

export type Action =
  | { type: 'OB_SET_STEP'; step: number }
  | { type: 'OB_SET_FIELD'; key: keyof OnboardingState; value: OnboardingState[keyof OnboardingState] }
  | { type: 'OB_CHOOSE'; key: keyof OnboardingState; value: OnboardingState[keyof OnboardingState] }
  | { type: 'OB_PLEDGE' }
  | { type: 'OB_RESET' }
  | { type: 'SELECT_ALT'; letra: string }
  | { type: 'MARK_ANSWERED'; correct: boolean }
  | { type: 'NEXT_QUESTION' }
  | { type: 'RESET_SESSION' }
  | { type: 'SET_FILTER'; key: keyof FiltersState; value: string }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_TIMER' }
  | { type: 'TICK_TIMER' }
  | { type: 'SET_MENTOR_OPEN'; open: boolean }
  | { type: 'SET_NAV_LOADING'; loading: boolean }
  | { type: 'AI_OPEN_SEED'; text: string }
  | { type: 'AI_SEND_USER'; text: string }
  | { type: 'AI_REPLY'; text: string }
  | { type: 'AI_RESET' };
