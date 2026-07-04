import { ArrowRight } from '@phosphor-icons/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  variant?: 'blue' | 'green' | 'disabled';
}

const VARIANTS = {
  blue: { bg: '#1557E6', shadow: '0 6px 0 #0E3DAE' },
  green: { bg: '#22A06B', shadow: '0 6px 0 #17784f' },
  disabled: { bg: '#c9d2e8', shadow: 'none' },
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
      className={`flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl border-none font-sans text-[16px] font-extrabold text-white transition-all ${className}`}
      style={{ background: v.bg, boxShadow: v.shadow, cursor: variant === 'disabled' ? 'default' : 'pointer', ...style }}
    >
      {iconPosition === 'start' && iconEl}
      {children}
      {iconPosition === 'end' && iconEl}
    </button>
  );
}
