"use client";
import React from 'react';
import clsx from 'clsx';

export type SurfaceLevel = 0 | 1 | 2 | 3 | 'inset' | 'muted';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  interactive?: boolean; // adds focus-ring + hover elevation transition
  asChild?: boolean; // future slot support
}

const levelClasses: Record<Exclude<SurfaceLevel, 'inset' | 'muted'>, string> = {
  0: 'bg-[var(--color-bg)] shadow-none',
  1: 'bg-[var(--color-bg-alt)] shadow-[var(--elevation-1)]',
  2: 'bg-[var(--color-bg-alt)] shadow-[var(--elevation-2)]',
  3: 'bg-[var(--color-bg-alt)] shadow-[var(--elevation-3)]'
};

// special semantic variants
const inset = 'bg-[var(--color-bg-inset)] shadow-none';
const muted = 'bg-[var(--color-bg-muted)] shadow-none';

export const Surface: React.FC<SurfaceProps> = ({ level = 0, interactive=false, className, children, ...rest }) => {
  const base = 'rounded-md border border-[var(--color-border)] transition-shadow transition-colors';
  const lvl = level === 'inset' ? inset : level === 'muted' ? muted : levelClasses[level];
  return (
    <div
      className={clsx(base, lvl, interactive && 'focus-ring outline-none hover:shadow-[var(--elevation-2)]', className)}
      {...rest}
    >
      {children}
    </div>
  );
};
