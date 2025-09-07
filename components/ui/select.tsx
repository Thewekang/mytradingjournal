"use client";
import React from 'react';
import clsx from 'clsx';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  fieldSize?: 'sm' | 'md';
  variant?: 'default' | 'inset';
  invalid?: boolean;
}

const sizeMap = {
  sm: 'h-8 text-xs px-2 rounded',
  md: 'h-9 text-sm px-3 rounded'
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, fieldSize='sm', variant='inset', invalid=false, disabled, multiple, ...rest }, ref
) {
  const surface = variant === 'inset' ? 'bg-[var(--color-bg-inset)]' : 'bg-[var(--color-bg-alt)]';
  return (
    <select
      ref={ref}
      data-invalid={invalid || undefined}
      multiple={multiple}
      className={clsx(
        'focus-ring transition-colors border',
        surface,
        'border-[var(--color-border-strong)]',
        sizeMap[fieldSize],
        multiple && 'h-auto py-1',
        invalid && 'outline-none ring-1 ring-[var(--color-danger-ring)] border-[var(--color-danger-border)]',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      {...rest}
    />
  );
});
