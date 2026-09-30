import { ArrowRight } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useAppState } from '../../../state/AppStateContext';
import FocoFala from './FocoFala';

// (11) 98765-4321 enquanto digita
function mascaraWhats(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function ContactStep() {
  const { state, dispatch } = useAppState();
  const { ob } = state;
  const primeiroNome = ob.nome.trim().split(/\s+/)[0];

  function erro(msg: string) {
    dispatch({ type: 'OB_SET_FIELD', key: 'contactError', value: msg });
  }

  function next(e: FormEvent) {
    e.preventDefault();
    const nome = ob.nome.trim();
    const email = ob.email.trim();
    const whatsDigits = ob.whats.replace(/\D/g, '');
    if (!nome) return erro('Digite seu nome.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('Digite um e-mail válido.');
    if (whatsDigits.length < 10) return erro('Digite um WhatsApp válido, com DDD.');
    erro('');
    dispatch({ type: 'OB_SET_STEP', step: ob.step + 1 });
  }

  return (
    <form className="ob-tela" onSubmit={next} noValidate>
      <FocoFala
        humor="wave"
        titulo={primeiroNome ? `Prazer, ${primeiroNome}! 👋` : 'Oi! Eu sou o Foco 👋'}
        subtitulo="Vou te acompanhar nos estudos. Primeiro, me conta como te chamar e onde te encontrar."
      />
      <div className="ob-campos">
        <div className="form-field ob-campo" style={{ '--i': 0 } as React.CSSProperties}>
          <label htmlFor="ob-nome">Nome</label>
          <input
            id="ob-nome"
            autoComplete="name"
            autoCapitalize="words"
            value={ob.nome}
            onChange={(e) => dispatch({ type: 'OB_SET_FIELD', key: 'nome', value: e.target.value })}
            placeholder="Seu nome"
          />
        </div>
        <div className="form-field ob-campo" style={{ '--i': 1 } as React.CSSProperties}>
          <label htmlFor="ob-email">E-mail</label>
          <input
            id="ob-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={ob.email}
            onChange={(e) => dispatch({ type: 'OB_SET_FIELD', key: 'email', value: e.target.value })}
            placeholder="voce@email.com"
          />
        </div>
        <div className="form-field ob-campo" style={{ '--i': 2 } as React.CSSProperties}>
          <label htmlFor="ob-whats">WhatsApp</label>
          <input
            id="ob-whats"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={ob.whats}
            onChange={(e) => dispatch({ type: 'OB_SET_FIELD', key: 'whats', value: mascaraWhats(e.target.value) })}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>
      {ob.contactError && (
        <p className="ob-erro" role="alert">
          {ob.contactError}
        </p>
      )}
      <button type="submit" className="button button-primary ob-botao">
        Continuar
        <ArrowRight size={19} />
      </button>
      <p className="ob-nota">Usamos seus dados para o seu plano, lembretes de estudo e para entender quem estuda com o Foco. Nada de spam.</p>
    </form>
  );
}
