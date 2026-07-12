export interface ChoiceOption {
  label: string;
  sub?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ChoiceStepProps {
  title: string;
  subtitle: string;
  options: ChoiceOption[];
}

export default function ChoiceStep({ title, subtitle, options }: ChoiceStepProps) {
  return (
    <div className="animate-slide-up p-[20px_22px_30px]">
      <div className="font-display text-[23px] font-extrabold leading-[1.25] tracking-[-0.3px] text-ink">{title}</div>
      <div className="mt-2 font-sans text-[13.5px] font-semibold leading-[1.5] text-text2">{subtitle}</div>
      <div className="mt-5.5 flex flex-col gap-2.5">
        {options.map((o) => (
          <button
            key={o.label}
            onClick={o.onClick}
            disabled={o.disabled}
            className="flex w-full items-center gap-3.5 rounded-2xl border-2 p-[15px_16px] text-left transition-all"
            style={{
              borderColor: o.active ? '#1557E6' : '#EDF0F8',
              background: o.active ? '#EEF3FF' : o.disabled ? '#F8FAFF' : '#fff',
              cursor: o.disabled ? 'default' : 'pointer',
              opacity: o.disabled ? 0.5 : 1,
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="font-sans text-[15px] font-extrabold text-ink">{o.label}</div>
              {o.sub && (
                <div className="mt-0.5 font-sans text-[12px] font-bold" style={{ color: o.active ? '#1557E6' : '#8791a8' }}>
                  {o.sub}
                </div>
              )}
            </div>
            <span
              className="ml-auto flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 font-sans text-[12px] font-extrabold text-white"
              style={{ borderColor: o.active ? '#1557E6' : '#d5dbe9', background: o.active ? '#1557E6' : '#fff' }}
            >
              {o.active ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
