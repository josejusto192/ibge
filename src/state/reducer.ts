import type { Action, AppState } from './types';

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'OB_SET_STEP':
      return { ...state, ob: { ...state.ob, step: action.step } };
    case 'OB_SET_FIELD':
      return { ...state, ob: { ...state.ob, [action.key]: action.value, contactError: null, authError: null } };
    case 'OB_CHOOSE':
      return { ...state, ob: { ...state.ob, [action.key]: action.value, step: state.ob.step + 1 } };
    case 'OB_PLEDGE':
      return { ...state, ob: { ...state.ob, commit: true, step: state.ob.step + 1 } };
    case 'OB_RESET':
      return { ...state, ob: { ...state.ob, submitting: false } };
    case 'SELECT_ALT':
      if (state.session.answered) return state;
      return { ...state, session: { ...state.session, selected: action.letra } };
    case 'MARK_ANSWERED': {
      if (!state.session.selected || state.session.answered) return state;
      const ok = action.correct;
      return {
        ...state,
        session: {
          ...state.session,
          answered: true,
          sessionAnswered: state.session.sessionAnswered + 1,
          sessionCorrect: state.session.sessionCorrect + (ok ? 1 : 0),
          gained: state.session.gained + (ok ? 10 : 0),
        },
      };
    }
    case 'NEXT_QUESTION':
      return {
        ...state,
        session: { ...state.session, qIndex: state.session.qIndex + 1, selected: null, answered: false },
        aiMessages: [],
        aiTyping: false,
      };
    case 'RESET_SESSION':
      return {
        ...state,
        session: { qIndex: 0, selected: null, answered: false, sessionCorrect: 0, sessionAnswered: 0, gained: 0 },
        timerOn: false,
        aiMessages: [],
        aiTyping: false,
      };
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'CLEAR_FILTERS':
      return { ...state, filters: { banca: '' } };
    case 'TOGGLE_TIMER':
      return { ...state, timerOn: !state.timerOn };
    case 'TICK_TIMER':
      return { ...state, seconds: state.seconds > 0 ? state.seconds - 1 : 0 };
    case 'SET_MENTOR_OPEN':
      return { ...state, mentorOpen: action.open };
    case 'SET_NAV_LOADING':
      return { ...state, navLoading: action.loading };
    case 'AI_OPEN_SEED':
      return state.aiMessages.length ? state : { ...state, aiMessages: [{ role: 'ai', text: action.text }] };
    case 'AI_SEND_USER':
      return { ...state, aiMessages: [...state.aiMessages, { role: 'user', text: action.text }], aiTyping: true };
    case 'AI_REPLY':
      return { ...state, aiMessages: [...state.aiMessages, { role: 'ai', text: action.text }], aiTyping: false };
    case 'AI_RESET':
      return { ...state, aiMessages: [], aiTyping: false };
    default:
      return state;
  }
}
