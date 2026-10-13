import { ArrowRight, ChatCircleText, Path, Target } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useAppState } from '../../../state/AppStateContext';
import AuthStory from '../../../components/AuthStory';

export default function WelcomeStep() {
  const { dispatch } = useAppState();
  return (
    <div className="auth-page">
      <AuthStory
        titulo={
          <>
            O próximo passo
            <br />é o seu <em>começo.</em>
          </>
        }
        texto="Transforme a preparação para o concurso em um hábito. Uma trilha, uma questão, uma conquista por vez."
        rodape="No seu ritmo. Com direção."
      />
      <div className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">SUA PREPARAÇÃO, COM FOCO</span>
          <h2>
            Um plano que cabe
            <br />
            na sua rotina.
          </h2>
          <p>Responda algumas perguntas rápidas. Eu, o Foco, organizo os próximos passos para você.</p>
          <div className="welcome-features">
            <div style={{ '--i': 0 } as React.CSSProperties}>
              <span className="metric-icon">
                <Path size={23} weight="duotone" />
              </span>
              <span>
                <strong>Saiba o que estudar</strong>
                <small>Trilhas organizadas em lições curtas.</small>
              </span>
            </div>
            <div style={{ '--i': 1 } as React.CSSProperties}>
              <span className="metric-icon yellow">
                <ChatCircleText size={23} weight="duotone" />
              </span>
              <span>
                <strong>Entenda cada resposta</strong>
                <small>Questões com comentários revisados.</small>
              </span>
            </div>
            <div style={{ '--i': 2 } as React.CSSProperties}>
              <span className="metric-icon green">
                <Target size={23} weight="duotone" />
              </span>
              <span>
                <strong>Não esqueça o que aprendeu</strong>
                <small>O que você erra volta para revisão na hora certa.</small>
              </span>
            </div>
          </div>
          <button className="button button-primary" onClick={() => dispatch({ type: 'OB_SET_STEP', step: 1 })}>
            Montar meu plano
            <ArrowRight size={19} />
          </button>
          <Link className="signup-link" to="/login">
            Já tem uma conta? <strong>Entrar</strong>
          </Link>
          <div className="auth-footer">
            <Link to="/termos">Termos de uso</Link>
            <Link to="/privacidade">Privacidade</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
