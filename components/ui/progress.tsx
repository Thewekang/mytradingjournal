"use client";
import React from 'react';
import clsx from 'clsx';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0-100
  indeterminate?: boolean;
  size?: 'sm' | 'md';
}

export const Progress: React.FC<ProgressProps> = ({ value, indeterminate=false, size='md', className, ...rest }) => {
  const clamped = typeof value === 'number' ? Math.min(100, Math.max(0, value)) : undefined;
  const height = size === 'sm' ? 4 : 8;
  return (
    <div
      className={clsx('relative overflow-hidden rounded-full bg-[var(--color-bg-inset)] border border-[var(--color-border-strong)]', className)}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-label={rest['aria-label'] || 'Progress'}
      {...rest}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 bg-[var(--color-accent)] animate-[progress-bar_1.2s_var(--ease)_infinite]" />
      ) : (
        <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${clamped ?? 0}%` }} />
      )}
    </div>
  );
};
