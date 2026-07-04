import { useNavigate } from 'react-router-dom';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAppState } from '../../../state/AppStateContext';

export default function WelcomeStep() {
  const { dispatch } = useAppState();
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-1 flex-col bg-app-bg p-[0_26px_30px]">
      <div
        className="absolute inset-x-0 top-0 z-0"
        style={{
          height: '54%',
          backgroundImage: "url('/assets/bg-blue-texture.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      />
      <div className="relative z-10 animate-slide-up pt-[70px] text-center">
        <div
          className="mx-auto flex h-[82px] w-[82px] items-center justify-center rounded-[24px] bg-yellow"
          style={{ boxShadow: '0 10px 0 #E0A800', transform: 'rotate(-6deg)' }}
        >
          <span className="font-display text-[42px] font-extrabold text-ink" style={{ transform: 'rotate(6deg)' }}>
            F
          </span>
        </div>
        <div className="mt-6 font-display text-[30px] font-extrabold tracking-[-0.5px] text-white">
          Foco<span className="text-yellow">.</span>
        </div>
        <div className="mt-2 font-sans text-[15px] font-bold leading-[1.4] text-[#c9d7fb]">
          Passe no concurso estudando
          <br />
          10 minutos por dia.
        </div>
      </div>
      <div
        className="relative z-10 mt-auto animate-slide-up rounded-3xl bg-surface p-[22px_20px]"
        style={{ boxShadow: '0 18px 40px -18px rgba(11,31,77,.35)', animationDelay: '.05s' }}
      >
        <div className="mb-5 flex justify-around text-center">
          <div>
            <div className="font-display text-[20px] font-extrabold text-blue">+40 mil</div>
            <div className="font-sans text-[11px] font-bold text-text3">questões</div>
          </div>
          <div className="w-px bg-border2" />
          <div>
            <div className="font-display text-[20px] font-extrabold text-blue">12 min</div>
            <div className="font-sans text-[11px] font-bold text-text3">média/dia</div>
          </div>
          <div className="w-px bg-border2" />
          <div>
            <div className="font-display text-[20px] font-extrabold text-blue">7 dias</div>
            <div className="font-sans text-[11px] font-bold text-text3">p/ virar hábito</div>
          </div>
        </div>
        <PrimaryButton onClick={() => dispatch({ type: 'OB_SET_STEP', step: 1 })}>Montar meu plano</PrimaryButton>
        <div onClick={() => navigate('/login')} className="mt-3.5 cursor-pointer text-center font-sans text-[13px] font-bold text-text2">
          Já tenho conta · <span className="font-extrabold text-blue">Entrar</span>
        </div>
      </div>
    </div>
  );
}
