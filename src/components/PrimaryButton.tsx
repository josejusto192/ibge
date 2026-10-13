import { ArrowRight } from '@phosphor-icons/react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  variant?: 'blue' | 'green' | 'red' | 'disabled';
}

// Botão "3D" (delight.css .btn-3d): a sombra sólida vira a base, e ao tocar
// o botão afunda e a sombra encolhe.
const VARIANTS = {
  blue: { bg: '#1557E6', sombra: '#0E3DAE' },
  green: { bg: '#22A06B', sombra: '#17784f' },
  red: { bg: '#E5484D', sombra: '#b8343a' },
  disabled: { bg: '#c9d2e8', sombra: 'transparent' },
};

export default function PrimaryButton({
  children,
  icon,
  iconPosition = 'end',
  variant = 'blue',
  className = '',
  style,
  ...rest
}: PrimaryButtonProps) {
  const v = VARIANTS[variant];
  const iconEl = icon !== undefined ? icon : <ArrowRight weight="bold" size={18} />;
  return (
    <button
      {...rest}
      className={`btn-3d flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white ${className}`}
      style={{ background: v.bg, '--btn-sombra': v.sombra, cursor: variant === 'disabled' ? 'default' : 'pointer', ...style } as CSSProperties}
    >
      {iconPosition === 'start' && iconEl}
      {children}
      {iconPosition === 'end' && iconEl}
    </button>
  );
}
