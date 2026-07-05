import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAppState } from '../../../state/AppStateContext';
import { supabase } from '../../../lib/supabase';
import { fetchModulos, registerReferral, resolveReferralCode } from '../../../lib/queries';

interface PlanStepProps {
  planConcurso: string;
  planMeta: number;
  planWeeks: number;
  refCode: string | null;
}

export default function PlanStep({ planConcurso, planMeta, planWeeks, refCode }: PlanStepProps) {
  const { state, dispatch } = useAppState();
  const { ob } = state;
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [modulos, setModulos] = useState<number | null>(null);

  useEffect(() => {
    if (ob.concurso == null) return;
    fetchModulos(ob.concurso).then((d) => setModulos(d.length));
  }, [ob.concurso]);

  async function finish() {
    if (password.trim().length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setError(null);
    dispatch({ type: 'OB_SET_FIELD', key: 'submitting', value: true });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: ob.email.trim(),
      password,
      options: { data: { full_name: ob.nome } },
    });

    if (signUpError) {
      dispatch({ type: 'OB_SET_FIELD', key: 'submitting', value: false });
      setError(signUpError.message.includes('already registered') ? 'Esse e-mail já tem conta. Faça login.' : 'Não foi possível criar a conta. Tente de novo.');
      return;
    }

    if (!data.session || !data.user) {
      // Confirmação de e-mail está ativa no projeto: não há sessão ainda,
      // então não dá pra gravar o perfil (RLS exige auth.uid()). O usuário
      // confirma o e-mail e completa o perfil no primeiro login.
      setAwaitingConfirmation(true);
      dispatch({ type: 'OB_SET_FIELD', key: 'submitting', value: false });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    await supabase.from('usuarios').upsert({
      id: data.user.id,
      email: ob.email.trim(),
      nome: ob.nome.trim(),
      whatsapp: ob.whats.trim(),
      faixa_etaria: ob.faixa,
      ja_prestou_concurso: ob.prestou === 'sim',
      nivel_preparo: ob.nivel,
      prazo_prova: ob.prazo,
      meta_diaria: planMeta,
      trilha_ativa_id: ob.concurso,
      streak: 1,
      ultimo_acesso: today,
      assinatura_ativa: true,
    });

    if (refCode) {
      try {
        const indicadorId = await resolveReferralCode(refCode);
        if (indicadorId && indicadorId !== data.user.id) await registerReferral(indicadorId, data.user.id);
      } catch {
        // indicação é um bônus, não deve travar o cadastro se falhar
      }
    }

    navigate('/trilha');
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-[14px_22px_30px] text-center animate-slide-up">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-yellow"
          style={{ boxShadow: '0 9px 0 #E0A800', transform: 'rotate(-6deg)' }}
        >
          <span className="font-display text-[34px] font-extrabold text-ink" style={{ transform: 'rotate(6deg)' }}>
            ✓
          </span>
        </div>
        <div className="mt-5 font-display text-[22px] font-extrabold text-ink">Confirme seu e-mail</div>
        <div className="mt-2 font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
          Enviamos um link de confirmação para <b>{ob.email}</b>. Depois de confirmar, faça login para completar seu plano.
        </div>
        <div className="mt-6 w-full">
          <PrimaryButton onClick={() => navigate('/login')}>Ir para o login</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up p-[14px_22px_30px]">
      <div className="text-center">
        <div
          className="mx-auto mt-2 flex h-[72px] w-[72px] animate-pop-in items-center justify-center rounded-[22px] bg-yellow"
          style={{ boxShadow: '0 9px 0 #E0A800', transform: 'rotate(-6deg)' }}
        >
          <span className="font-display text-[34px] font-extrabold text-ink" style={{ transform: 'rotate(6deg)' }}>
            ★
          </span>
        </div>
        <div className="mt-5 font-display text-[24px] font-extrabold text-ink">Seu plano está pronto!</div>
        <div className="mt-1.5 font-sans text-[13.5px] font-semibold text-text2">Feito sob medida para o seu objetivo.</div>
      </div>

      <div
        className="mt-5.5 rounded-[20px] p-5"
        style={{ background: 'linear-gradient(135deg,#1557E6,#2f6bf0)', boxShadow: '0 14px 30px -14px rgba(21,87,230,.7)' }}
      >
        <div className="font-sans text-[11px] font-bold tracking-[0.5px] text-[#bcd0fb]">TRILHA</div>
        <div className="mt-0.5 font-sans text-[18px] font-extrabold text-white">{planConcurso}</div>
        <div className="mt-4 flex gap-2.5">
          <div className="flex-1 rounded-[13px] bg-white/[.14] p-3">
            <div className="font-display text-[19px] font-extrabold text-yellow">{planMeta}</div>
            <div className="font-sans text-[10.5px] font-bold text-[#c9d7fb]">questões/dia</div>
          </div>
          <div className="flex-1 rounded-[13px] bg-white/[.14] p-3">
            <div className="font-display text-[19px] font-extrabold text-yellow">~{planWeeks}</div>
            <div className="font-sans text-[10.5px] font-bold text-[#c9d7fb]">semanas p/ concluir</div>
          </div>
          <div className="flex-1 rounded-[13px] bg-white/[.14] p-3">
            <div className="font-display text-[19px] font-extrabold text-yellow">{modulos ?? '—'}</div>
            <div className="font-sans text-[10.5px] font-bold text-[#c9d7fb]">módulos</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-2xl border-[1.5px] border-border2 bg-surface p-[14px_16px]">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-yellow-tint font-sans text-[16px] font-extrabold text-yellow-deep">
          1
        </span>
        <div className="font-sans text-[13px] font-bold leading-[1.45] text-ink-soft">
          Sua primeira meta já vale <b className="text-blue">+50 XP</b>. Comece agora para não perder o embalo.
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">CRIE UMA SENHA</div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Mínimo 6 caracteres"
          className="h-[50px] w-full rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] px-3.5 font-sans text-[14px] font-semibold text-ink outline-none"
        />
      </div>
      {error && <div className="mt-2.5 font-sans text-[12.5px] font-bold text-error">{error}</div>}

      <div className="mt-5.5">
        <PrimaryButton onClick={finish} variant={ob.submitting ? 'disabled' : 'blue'} disabled={ob.submitting}>
          {ob.submitting ? 'Criando conta...' : 'Criar conta e começar'}
        </PrimaryButton>
      </div>
      <div className="mt-3 text-center font-sans text-[12px] font-semibold text-text3">Grátis para começar · sem cartão</div>
    </div>
  );
}
