import { ArrowLeft, ArrowRight, CircleNotch, EnvelopeSimple } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AuthStory from '../components/AuthStory';
import Mascot from '../components/Mascot';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const limpo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
      setError('Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(limpo, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (resetError) {
        setError(
          /rate|limit|seconds/i.test(resetError.message)
            ? 'Você pediu vários links seguidos. Espere um minuto e tente de novo.'
            : 'Não foi possível enviar o link agora. Tente de novo em instantes.',
        );
        return;
      }
      setSent(true);
    } catch {
      setError('Não conseguimos conectar. Verifique sua internet e tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthStory
        humor={sent ? 'happy' : 'thinking'}
        titulo={
          <>
            Acontece com
            <br />
            <em>todo mundo.</em>
          </>
        }
        texto="Em um minuto você cria uma senha nova e volta de onde parou. Seu progresso fica guardado."
      />
      <div className="auth-form-wrap">
        {sent ? (
          <div className="auth-form auth-sucesso">
            <Mascot mood="happy" size={104} />
            <h2>Confira seu e-mail</h2>
            <p>
              Se <b>{email.trim()}</b> tiver uma conta, mandei um link para criar uma senha nova. Ele vale por pouco tempo.
            </p>
            <p className="ob-nota">Não chegou? Veja a caixa de spam ou promoções.</p>
            <button type="button" className="button button-primary" onClick={() => setSent(false)}>
              <EnvelopeSimple size={19} />
              Enviar de novo
            </button>
            <Link to="/login" className="signup-link">
              <strong>Voltar para o login</strong>
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSend} noValidate>
            <Link to="/login" className="auth-voltar">
              <ArrowLeft size={16} weight="bold" /> Voltar
            </Link>
            <span className="eyebrow">RECUPERAR ACESSO</span>
            <h2>Esqueceu sua senha?</h2>
            <p>Informe o e-mail da sua conta. Eu mando um link para você criar uma senha nova.</p>
            <div className="form-field">
              <label htmlFor="esqueci-email">E-mail</label>
              <input
                id="esqueci-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </div>
            {error && (
              <p className="auth-aviso" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar link'}
              {loading ? <CircleNotch className="busy-icon" size={19} /> : <ArrowRight size={19} />}
            </button>
            <Link to="/onboarding" className="signup-link">
              Ainda não tem conta? <strong>Comece por aqui</strong>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
