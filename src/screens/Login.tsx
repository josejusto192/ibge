import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError('E-mail ou senha incorretos.');
      return;
    }
    navigate('/trilha');
  }

  return (
    <div className="scr relative flex flex-1 flex-col overflow-y-auto bg-app-bg p-[0_26px_32px]">
      <div
        className="absolute inset-x-0 top-0 z-0"
        style={{ height: '42%', backgroundImage: "url('/assets/bg-blue-texture.png')", backgroundSize: 'cover', backgroundPosition: 'center top' }}
      />
      <div className="relative z-10 animate-slide-up pt-16 text-center">
        <div
          className="mx-auto flex h-[78px] w-[78px] items-center justify-center rounded-[22px] bg-yellow"
          style={{ boxShadow: '0 10px 0 #E0A800', transform: 'rotate(-6deg)' }}
        >
          <span className="font-display text-[40px] font-extrabold text-ink" style={{ transform: 'rotate(6deg)' }}>
            F
          </span>
        </div>
        <div className="mt-5.5 font-display text-[30px] font-extrabold tracking-[-0.5px] text-white">
          Foco<span className="text-yellow">.</span>
        </div>
        <div className="mt-1.5 font-sans text-[14px] font-semibold text-[#c9d7fb]">Trilhas de questões para concursos</div>
      </div>

      <div
        className="relative z-10 mt-11 animate-slide-up rounded-3xl bg-surface p-[22px_20px]"
        style={{ boxShadow: '0 18px 40px -18px rgba(11,31,77,.35)', animationDelay: '.05s' }}
      >
        <div className="font-sans text-[18px] font-extrabold text-ink">Bem-vindo de volta 👋</div>
        <div className="mt-1 font-sans text-[13px] font-medium text-text2">Continue de onde parou na sua trilha.</div>

        <div className="mt-5">
          <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">E-MAIL</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[14px] font-semibold text-ink outline-none"
          />
        </div>
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="font-sans text-[12px] font-bold text-text2">SENHA</div>
            <div onClick={() => navigate('/esqueci-senha')} className="cursor-pointer font-sans text-[12px] font-bold text-blue">
              Esqueceu a senha?
            </div>
          </div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Sua senha"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[14px] font-semibold tracking-[2px] text-ink outline-none"
          />
        </div>

        {error && <div className="mt-3 font-sans text-[12.5px] font-bold text-error">{error}</div>}

        <div className="mt-5.5">
          <PrimaryButton onClick={handleLogin} disabled={loading || !email || !password} variant={loading ? 'disabled' : 'blue'}>
            {loading ? 'Entrando...' : 'Entrar'}
          </PrimaryButton>
        </div>
        <div onClick={() => navigate('/onboarding')} className="mt-3.5 cursor-pointer text-center font-sans text-[13px] font-semibold text-text2">
          Novo por aqui? <span className="font-extrabold text-blue">Criar conta grátis</span>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex animate-slide-up justify-center gap-2.5" style={{ animationDelay: '.1s' }}>
        <div className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-border bg-surface px-3.5 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow" />
          <span className="font-sans text-[12px] font-bold text-ink">+40 mil questões</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border-[1.5px] border-border bg-surface px-3.5 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue" />
          <span className="font-sans text-[12px] font-bold text-ink">Foco no IBGE</span>
        </div>
      </div>
    </div>
  );
}
