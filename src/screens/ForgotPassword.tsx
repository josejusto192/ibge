import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../components/PrimaryButton';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (loading || !email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (resetError) {
      setError('Não foi possível enviar o link agora. Tente de novo em instantes.');
      return;
    }
    setSent(true);
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
        {sent ? (
          <>
            <div className="font-sans text-[18px] font-extrabold text-ink">Verifique seu e-mail 📩</div>
            <div className="mt-1 font-sans text-[13px] font-medium text-text2">
              Se <strong>{email}</strong> tiver uma conta, mandamos um link de redefinição pra ele. Abra o e-mail e escolha uma nova
              senha.
            </div>
          </>
        ) : (
          <>
            <div className="font-sans text-[18px] font-extrabold text-ink">Esqueceu sua senha?</div>
            <div className="mt-1 font-sans text-[13px] font-medium text-text2">Informe seu e-mail e mandamos um link pra redefinir.</div>

            <div className="mt-5">
              <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">E-MAIL</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[14px] font-semibold text-ink outline-none"
              />
            </div>

            {error && <div className="mt-3 font-sans text-[12.5px] font-bold text-error">{error}</div>}

            <div className="mt-5.5">
              <PrimaryButton onClick={handleSend} disabled={loading || !email.trim()} variant={loading ? 'disabled' : 'blue'}>
                {loading ? 'Enviando...' : 'Enviar link'}
              </PrimaryButton>
            </div>
          </>
        )}
        <div onClick={() => navigate('/login')} className="mt-3.5 cursor-pointer text-center font-sans text-[13px] font-semibold text-text2">
          <span className="font-extrabold text-blue">Voltar para o login</span>
        </div>
      </div>
    </div>
  );
}
