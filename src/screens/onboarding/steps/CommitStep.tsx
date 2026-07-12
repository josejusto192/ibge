import { HandPalm } from '@phosphor-icons/react';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAppState } from '../../../state/AppStateContext';

export default function CommitStep({ commitLine }: { commitLine: string }) {
  const { dispatch } = useAppState();

  return (
    <div className="flex flex-1 animate-slide-up flex-col p-[8px_24px_30px] text-center">
      <div className="mt-5 font-sans text-[12px] font-bold tracking-[1px] text-text3">SEU COMPROMISSO</div>
      <div className="mt-3.5 font-display text-[26px] font-extrabold leading-[1.3] text-ink">“{commitLine}, todos os dias.”</div>
      <div className="mt-4.5 rounded-[18px] border-[1.5px] border-yellow-border bg-yellow-tint p-[18px]">
        <div className="font-sans text-[13.5px] font-bold leading-[1.6] text-yellow-text">
          Quem estuda <b>7 dias seguidos</b> tem <b>3x mais chance</b> de manter o hábito. Um pequeno compromisso com você mesmo muda o
          resultado.
        </div>
      </div>
      <div className="flex-1" />
      <PrimaryButton
        onClick={() => dispatch({ type: 'OB_PLEDGE' })}
        icon={<HandPalm weight="bold" size={18} />}
        iconPosition="start"
        className="h-14"
      >
        Eu me comprometo
      </PrimaryButton>
      <div className="mt-3 font-sans text-[12px] font-semibold text-text3">Você pode ajustar sua meta quando quiser.</div>
    </div>
  );
}
