import PrimaryButton from '../../../components/PrimaryButton';
import { useAppState } from '../../../state/AppStateContext';

const inputClass =
  'w-full h-[50px] px-3.5 rounded-2xl border-[1.5px] border-border bg-[#F8FAFF] font-sans text-[14px] font-semibold text-ink outline-none';

export default function ContactStep() {
  const { state, dispatch } = useAppState();
  const { ob } = state;

  function next() {
    const nome = ob.nome.trim();
    const email = ob.email.trim();
    const whatsDigits = ob.whats.replace(/\D/g, '');
    if (!nome) {
      dispatch({ type: 'OB_SET_FIELD', key: 'contactError', value: 'Digite seu nome.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      dispatch({ type: 'OB_SET_FIELD', key: 'contactError', value: 'Digite um e-mail válido.' });
      return;
    }
    if (whatsDigits.length < 10) {
      dispatch({ type: 'OB_SET_FIELD', key: 'contactError', value: 'Digite um WhatsApp válido, com DDD.' });
      return;
    }
    dispatch({ type: 'OB_SET_STEP', step: ob.step + 1 });
  }

  return (
    <div className="animate-slide-up p-[20px_22px_30px]">
      <div className="font-display text-[23px] font-extrabold leading-[1.25] tracking-[-0.3px] text-ink">Vamos te conhecer</div>
      <div className="mt-2 font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">
        Pra personalizar seu plano e te avisar na hora certa de estudar.
      </div>
      <div className="mt-5.5 flex flex-col gap-3.5">
        <div>
          <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">NOME</div>
          <input
            value={ob.nome}
            onChange={(e) => dispatch({ type: 'OB_SET_FIELD', key: 'nome', value: e.target.value })}
            placeholder="Seu nome"
            className={inputClass}
          />
        </div>
        <div>
          <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">E-MAIL</div>
          <input
            value={ob.email}
            onChange={(e) => dispatch({ type: 'OB_SET_FIELD', key: 'email', value: e.target.value })}
            placeholder="voce@email.com"
            className={inputClass}
          />
        </div>
        <div>
          <div className="mb-1.5 font-sans text-[12px] font-bold text-text2">WHATSAPP</div>
          <input
            value={ob.whats}
            onChange={(e) => dispatch({ type: 'OB_SET_FIELD', key: 'whats', value: e.target.value })}
            placeholder="(00) 00000-0000"
            className={inputClass}
          />
        </div>
      </div>
      {ob.contactError && <div className="mt-3 font-sans text-[12.5px] font-bold text-error">{ob.contactError}</div>}
      <div className="mt-5.5">
        <PrimaryButton onClick={next}>Continuar</PrimaryButton>
      </div>
      <div className="mt-3 text-center font-sans text-[12px] font-semibold text-text3">
        Usamos isso só para o seu plano de estudos e lembretes.
      </div>
    </div>
  );
}
