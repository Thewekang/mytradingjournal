"use client";
import React from 'react';
import clsx from 'clsx';

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const base = 'inline-flex items-center justify-center font-medium rounded-md focus-ring transition-colors';
const sizeMap: Record<Size,string> = {
  sm: 'h-8 px-3 text-xs gap-1',
  md: 'h-10 px-4 text-sm gap-2'
};
const variantMap: Record<Variant,string> = {
  solid: 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)]',
  outline: 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]',
  ghost: 'text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]',
  danger: 'bg-[var(--color-danger)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-danger-hover)]'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant='solid', size='md', loading=false, leftIcon, rightIcon, className, children, disabled, ...rest }) => {
  return (
    <button
      className={clsx(base, sizeMap[size], variantMap[variant], (disabled||loading) && 'opacity-60 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="animate-spin h-4 w-4 border-2 border-[var(--color-spinner-track)] border-t-[var(--color-accent-foreground)] rounded-full" aria-hidden />}
      {!loading && leftIcon}
      <span className="whitespace-nowrap">{children}</span>
      {!loading && rightIcon}
    </button>
  );
};
