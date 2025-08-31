import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'outline';
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  rounded?: boolean;
}

const variantMap: Record<BadgeVariant,string> = {
  neutral: 'bg-[var(--color-bg-alt)] text-[var(--color-text)] border border-[var(--color-border)]',
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)] border border-[var(--color-success)]/40',
  danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/40',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/40',
  info: 'bg-[var(--color-info)]/15 text-[var(--color-info)] border border-[var(--color-info)]/40',
  accent: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/40',
  outline: 'border border-[var(--color-border)] text-[var(--color-muted)]'
};

const sizeMap = {
  sm: 'text-[10px] h-5 px-2 gap-1',
  md: 'text-xs h-6 px-2.5 gap-1.5'
};

export const Badge: React.FC<BadgeProps> = ({ variant='neutral', size='sm', rounded=false, className, ...rest }) => {
  return <span className={clsx('inline-flex items-center font-medium tracking-wide select-none', 'uppercase', 'whitespace-nowrap', 'border rounded-md', sizeMap[size], rounded && 'rounded-full', variantMap[variant], className)} {...rest} />;
};