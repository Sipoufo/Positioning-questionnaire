// Button.tsx
// Primary/secondary/ghost buttons honoring the Happy Cash palette.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-hc-green-founder text-white hover:bg-hc-green-pillar disabled:bg-hc-gray-mid disabled:cursor-not-allowed',
  secondary:
    'bg-white text-hc-green-founder border border-hc-green-accent hover:bg-hc-bg-mint disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-hc-green-pillar hover:bg-hc-bg-mint disabled:opacity-50 disabled:cursor-not-allowed',
};

export const Button = ({ variant = 'primary', className = '', children, ...rest }: ButtonProps) => {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hc-green-accent focus-visible:ring-offset-2 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
