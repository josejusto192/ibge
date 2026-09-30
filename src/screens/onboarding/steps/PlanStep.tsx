import { ArrowRight, CalendarCheck, CircleNotch, Eye, EyeSlash, Lightning, Path } from '@phosphor-icons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Confetti from '../../../components/Confetti';
import LegalSheet, { type LegalDoc } from '../../../components/sheets/LegalSheet';
import { useAppState } from '../../../state/AppStateContext';
import { supabase } from '../../../lib/supabase';
import { fetchPlanoOnboarding, registerReferral, registrarOnboarding, resolveReferralCode, type PlanoOnboarding } from '../../../lib/queries';
import { som } from '../../../lib/efeitos';
import { lerOrigem } from '../../../lib/origem';
import type { OnboardingState } from '../../../state/types';
import FocoFala from './FocoFala';

interface PlanStepProps {
  planConcurso: string;
  planMeta: number;
  prazoDias: number | null;
  refCode: string | null;
}

// Mesmos campos que o perfil guarda; vão também nos dados da conta para o
// caso de o projeto exigir confirmação de e-mail (o perfil é criado no 1º login).
function perfilDoOnboarding(ob: OnboardingState, meta: number) {
  return {
    nome: ob.nome.trim(),
    whatsapp: ob.whats.trim(),
    faixa_etaria: ob.faixa,
    ja_prestou_concurso: ob.prestou == null ? null : ob.prestou === 'sim',
    nivel_preparo: ob.nivel,
    prazo_prova: ob.prazo,
    meta_diaria: meta,
    trilha_ativa_id: ob.concurso,
    termos_aceitos_em: new Date().toISOString(),
    ...origemDoCadastro(),
  };
}

// UTMs e site de origem guardados na chegada (src/lib/origem.ts).
function origemDoCadastro() {
  const o = lerOrigem();
  if (!o) return {};
  return {
    utm_source: o.utm_source,
    utm_medium: o.utm_medium,
    utm_campaign: o.utm_campaign,
    utm_content: o.utm_content,
    utm_term: o.utm_term,
    origem_referrer: o.origem_referrer,
    origem_pagina: o.origem_pagina,
    origem_em: o.origem_em,
  };
}

export default function PlanStep({ planConcurso, planMeta, prazoDias, refCode }: PlanStepProps) {
  const { state, dispatch } = useAppState();
  const { ob } = state;
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jaTemConta, setJaTemConta] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [plano, setPlano] = useState<PlanoOnboarding | null>(null);

  useEffect(() => {
    som.conclusao();
  }, []);

  useEffect(() => {
    if (ob.concurso == null) return;
    fetchPlanoOnboarding(ob.concurso)
      .then(setPlano)
      .catch(() => setPlano(null));
  }, [ob.concurso]);

  // Semanas para concluir a trilha no ritmo escolhido (com o tamanho real dela).
  const dias = plano && plano.questoes > 0 ? Math.ceil(plano.questoes / planMeta) : null;
  const semanas = dias != null ? Math.ceil(dias / 7) : null;
  const cabeNoPrazo = dias != null && prazoDias != null ? dias <= prazoDias : null;
  const tamanho = !plano
    ? '…'
    : plano.licoes !== plano.unidades
      ? `${plano.licoes} ${plano.licoes === 1 ? 'lição' : 'lições'}`
      : `${plano.unidades} ${plano.unidades === 1 ? 'etapa' : 'etapas'}`;
  const previsao =
    dias == null ? '…' : dias < 7 ? 'menos de 1 semana' : `cerca de ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  const primeiroNome = ob.nome.trim().split(/\s+/)[0];

  async function finish(e: FormEvent) {
    e.preventDefault();
    if (ob.submitting) return;
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (!aceitouTermos) {
      setError('Para continuar, aceite os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setError(null);
    setJaTemConta(false);
    dispatch({ type: 'OB_SET_FIELD', key: 'submitting', value: true });

    const perfil = perfilDoOnboarding(ob, planMeta);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: ob.email.trim().toLowerCase(),
        password,
        options: { data: { full_name: perfil.nome, onboarding: perfil } },
      });

      if (signUpError) {
        const existe = /already registered|already exists/i.test(signUpError.message);
        setJaTemConta(existe);
        setError(existe ? 'Esse e-mail já tem uma conta.' : 'Não foi possível criar a conta. Tente de novo.');
        return;
      }

      if (!data.session || !data.user) {
        // Confirmação de e-mail ativa: o perfil é criado no primeiro login
        // com os dados guardados na conta (useUsuario).
        setAwaitingConfirmation(true);
        return;
      }

      await supabase.from('usuarios').upsert({
        id: data.user.id,
        email: ob.email.trim().toLowerCase(),
        ...perfil,
        streak: 0,
        ultimo_acesso: new Date().toISOString().split('T')[0],
      });
      registrarOnboarding('conta_criada');

      if (refCode) {
        try {
          const indicadorId = await resolveReferralCode(refCode);
          if (indicadorId && indicadorId !== data.user.id) await registerReferral(indicadorId, data.user.id);
        } catch {
          // indicação é um bônus, não deve travar o cadastro se falhar
        }
      }

      navigate('/trilha');
    } catch {
      setError('Não conseguimos conectar. Verifique sua internet e tente de novo.');
    } finally {
      dispatch({ type: 'OB_SET_FIELD', key: 'submitting', value: false });
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="ob-tela ob-centro">
        <FocoFala
          humor="happy"
          titulo="Falta só confirmar seu e-mail 📩"
          subtitulo={
            <>
              Mandei um link para <b>{ob.email}</b>. Abra, confirme e depois entre com seu e-mail e senha. Seu plano já fica salvo.
            </>
          }
        />
        <button type="button" className="button button-primary ob-botao" onClick={() => navigate('/login')}>
          Ir para o login
          <ArrowRight size={19} />
        </button>
        <p className="ob-nota">Não chegou? Confira a caixa de spam ou promoções.</p>
      </div>
    );
  }

  return (
    <form className="ob-tela" onSubmit={finish} noValidate>
      <Confetti disparo={1} quantidade={80} origemY={0.22} />
      <FocoFala
        humor="celebrate"
        titulo={primeiroNome ? `${primeiroNome}, seu plano está pronto!` : 'Seu plano está pronto!'}
        subtitulo="Feito com as suas respostas. Crie sua senha para começar."
      />

      <div className="ob-plano">
        <span className="ob-plano-rotulo">SUA TRILHA</span>
        <strong className="ob-plano-nome">{planConcurso}</strong>
        <ul className="ob-plano-lista">
          <li>
            <span className="ob-plano-icone">
              <Lightning size={16} weight="fill" />
            </span>
            <span className="ob-plano-item">Meta diária</span>
            <b>{planMeta} questões</b>
          </li>
          <li>
            <span className="ob-plano-icone">
              <Path size={16} weight="fill" />
            </span>
            <span className="ob-plano-item">Tamanho da trilha</span>
            <b>{tamanho}</b>
          </li>
          <li>
            <span className="ob-plano-icone">
              <CalendarCheck size={16} weight="fill" />
            </span>
            <span className="ob-plano-item">Previsão</span>
            <b>{previsao}</b>
          </li>
        </ul>
        {cabeNoPrazo != null && (
          <p className={`ob-plano-prazo${cabeNoPrazo ? ' ok' : ''}`}>
            {cabeNoPrazo
              ? '✓ Nesse ritmo, dá tempo de terminar antes da prova.'
              : 'Dica: para terminar antes da prova, aumente um pouco a meta diária depois, no Perfil.'}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="ob-senha">Crie uma senha</label>
        <div className="password-field">
          <input
            id="ob-senha"
            type={verSenha ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <button type="button" className="icon-button" aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVerSenha(!verSenha)}>
            {verSenha ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <label className="ob-termos">
        <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} />
        <span>
          Li e aceito os{' '}
          <button type="button" onClick={() => setLegalDoc('termos')}>
            Termos de Uso
          </button>{' '}
          e a{' '}
          <button type="button" onClick={() => setLegalDoc('privacidade')}>
            Política de Privacidade
          </button>
          .
        </span>
      </label>

      {error && (
        <p className="ob-erro" role="alert">
          {error}{' '}
          {jaTemConta && (
            <Link to="/login" className="font-extrabold text-blue underline">
              Entrar
            </Link>
          )}
        </p>
      )}

      <button type="submit" className="button button-primary ob-botao" disabled={ob.submitting}>
        {ob.submitting ? 'Criando sua conta…' : 'Criar conta e começar'}
        {ob.submitting ? <CircleNotch className="busy-icon" size={19} /> : <ArrowRight size={19} />}
      </button>
      <p className="ob-nota">Grátis para começar · sem cartão</p>

      {legalDoc && <LegalSheet doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </form>
  );
}
