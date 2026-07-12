import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { session, loading: loadingAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSave() {
    if (loading) return;
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError('Não foi possível salvar a nova senha. Peça um novo link e tente de novo.');
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/trilha'), 1800);
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
      </div>

      <div
        className="relative z-10 mt-11 animate-slide-up rounded-3xl bg-surface p-[22px_20px]"
        style={{ boxShadow: '0 18px 40px -18px rgba(11,31,77,.35)', animationDelay: '.05s' }}
      >
        {loadingAuth ? (
          <div className="py-6 text-center font-sans text-[13.5px] font-semibold text-text2">Carregando…</div>
        ) : done ? (
          <div className="font-sans text-[18px] font-extrabold text-ink">Senha atualizada ✓</div>
        ) : !session ? (
          <>
            <div className="font-sans text-[18px] font-extrabold text-ink">Link inválido ou expirado</div>
            <div className="mt-1 font-sans text-[13px] font-medium text-text2">
              Peça um novo link de redefinição e tente de novo.
            </div>
            <div onClick={() => navigate('/esqueci-senha')} className="mt-5.5 cursor-pointer text-center font-sans text-[13px] font-extrabold text-blue">
              Pedir novo link
            </div>
          </>
        ) : (
          <>
            <div className="font-sans text-[18px] font-extrabold text-ink">Escolha uma nova senha</div>
            <div className="mt-1 font-sans text-[13px] font-medium text-text2">Mínimo de 6 caracteres.</div>

            <div className="mt-5">
              <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">NOVA SENHA</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Sua nova senha"
                className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[14px] font-semibold tracking-[2px] text-ink outline-none"
              />
            </div>
            <div className="mt-3.5">
              <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">CONFIRMAR SENHA</div>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                placeholder="Repita a nova senha"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[14px] font-semibold tracking-[2px] text-ink outline-none"
              />
            </div>

            {error && <div className="mt-3 font-sans text-[12.5px] font-bold text-error">{error}</div>}

            <div className="mt-5.5">
              <PrimaryButton onClick={handleSave} disabled={loading || !password || !confirm} variant={loading ? 'disabled' : 'blue'}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
