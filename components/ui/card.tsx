"use client";
import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean; // future slot support
  interactive?: boolean; // adds hover & focus styles
  muted?: boolean; // uses muted surface token
  inset?: boolean; // uses inset surface token
}

// Base surface uses semantic CSS variable tokens rather than raw tailwind colors.
// Focus styling: reuse global .focus-ring helper for keyboard accessibility.
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, children, interactive=false, muted=false, inset=false, ...rest }, ref
) {
  const surfaceToken = inset ? 'var(--color-bg-inset)' : muted ? 'var(--color-bg-muted)' : 'var(--color-bg-alt)';
  return (
    <div
      ref={ref}
      className={clsx(
        'card rounded-lg border text-sm transition-colors',
        'border-[var(--color-border)]',
  'shadow-[var(--elevation-1)]',
        interactive && 'cursor-pointer hover:border-[var(--color-border-strong)]',
        interactive && 'hover:bg-[var(--color-bg-muted)]',
        interactive && 'focus-ring focus:outline-none',
        'focus-ring',
        className
      )}
      style={{ background: surfaceToken }}
      {...rest}
    >
      {children}
    </div>
  );
});

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={clsx('px-4 pt-4 pb-2 flex items-start justify-between gap-2', className)} {...rest} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...rest }) => (
  <h3 className={clsx('text-xs font-semibold tracking-wide uppercase text-[var(--color-muted)]', className)} {...rest} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={clsx('px-4 pb-4 flex flex-col gap-2', className)} {...rest} />
);
