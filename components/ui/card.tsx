import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const padMap = { sm: 'p-3', md: 'p-4', lg: 'p-6' };

export function Card({ className, padding='md', interactive=false, ...rest }: CardProps) {
  return (
    <div
      className={clsx('bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg shadow-sm', padMap[padding], interactive && 'transition-shadow hover:shadow-md hover:shadow-black/40', className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mb-3 flex items-center justify-between gap-2', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={clsx('text-sm font-semibold tracking-wide', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('text-sm', className)} {...rest} />;
}
