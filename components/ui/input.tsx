"use client";
import React from 'react';
import clsx from 'clsx';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  fieldSize?: 'sm' | 'md';
  variant?: 'default' | 'inset';
  invalid?: boolean;
}

const sizeMap = {
  sm: 'h-8 text-xs px-2 rounded',
  md: 'h-9 text-sm px-3 rounded'
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, fieldSize='md', variant='default', invalid=false, disabled, ...rest }, ref
) {
  const surface = variant === 'inset' ? 'bg-[var(--color-bg-inset)]' : 'bg-[var(--color-bg-alt)]';
  return (
    <input
      ref={ref}
      data-invalid={invalid || undefined}
      className={clsx(
        'focus-ring transition-colors border',
        surface,
        'border-[var(--color-border-strong)]',
        'placeholder:text-[var(--color-muted)]',
  sizeMap[fieldSize],
        invalid && 'outline-none ring-1 ring-red-500 border-red-500',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      {...rest}
    />
  );
});
