import { ArrowRight, CircleNotch, Eye, EyeSlash } from '@phosphor-icons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthStory from '../components/AuthStory';
import Mascot from '../components/Mascot';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { som } from '../lib/efeitos';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { session, loading: loadingAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    som.conclusao();
    const id = window.setTimeout(() => navigate('/trilha', { replace: true }), 2200);
    return () => window.clearTimeout(id);
  }, [done, navigate]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As duas senhas não são iguais.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          /different|same/i.test(updateError.message)
            ? 'A senha nova precisa ser diferente da antiga.'
            : 'Não foi possível salvar a nova senha. Peça um novo link e tente de novo.',
        );
        return;
      }
      setDone(true);
    } catch {
      setError('Não conseguimos conectar. Verifique sua internet e tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  let conteudo;
  if (loadingAuth) {
    conteudo = (
      <div className="auth-form auth-sucesso" aria-busy="true">
        <Mascot mood="thinking" size={96} />
        <p>Conferindo o seu link…</p>
      </div>
    );
  } else if (done) {
    conteudo = (
      <div className="auth-form auth-sucesso">
        <Mascot mood="celebrate" size={110} />
        <h2>Senha atualizada!</h2>
        <p>Tudo certo. Levando você de volta para a sua trilha…</p>
      </div>
    );
  } else if (!session) {
    conteudo = (
      <div className="auth-form auth-sucesso">
        <Mascot mood="encourage" size={100} />
        <h2>Esse link não vale mais</h2>
        <p>Os links de senha expiram depois de um tempo ou quando já foram usados. Peça um novo, é rapidinho.</p>
        <Link to="/esqueci-senha" className="button button-primary">
          Pedir novo link
          <ArrowRight size={19} />
        </Link>
        <Link to="/login" className="signup-link">
          <strong>Voltar para o login</strong>
        </Link>
      </div>
    );
  } else {
    conteudo = (
      <form className="auth-form" onSubmit={handleSave} noValidate>
        <span className="eyebrow">NOVA SENHA</span>
        <h2>Escolha uma nova senha</h2>
        <p>Use pelo menos 6 caracteres. Dica: uma frase curta é fácil de lembrar e difícil de adivinhar.</p>
        <div className="form-field">
          <label htmlFor="nova-senha">Nova senha</label>
          <div className="password-field">
            <input
              id="nova-senha"
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua nova senha"
            />
            <button type="button" className="icon-button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>
              {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="confirma-senha">Confirme a nova senha</label>
          <input
            id="confirma-senha"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </div>
        {error && (
          <p className="auth-aviso" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar nova senha'}
          {loading ? <CircleNotch className="busy-icon" size={19} /> : <ArrowRight size={19} />}
        </button>
      </form>
    );
  }

  return (
    <div className="auth-page">
      <AuthStory
        humor={done ? 'celebrate' : 'idle'}
        titulo={
          <>
            Senha nova,
            <br />
            <em>mesmo foco.</em>
          </>
        }
        texto="Seu progresso, sua ofensiva e seu caderno de erros continuam do jeito que você deixou."
      />
      <div className="auth-form-wrap">{conteudo}</div>
    </div>
  );
}
