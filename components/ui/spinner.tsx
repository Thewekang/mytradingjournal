"use client";
import React from 'react';
import clsx from 'clsx';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  thickness?: number;
  colorVar?: string; // css variable reference
}

export const Spinner: React.FC<SpinnerProps> = ({ size=16, thickness=2, colorVar='--color-accent', className, ...rest }) => {
  return (
    <span
      className={clsx('inline-block animate-spin', className)}
      style={{ width: size, height: size, borderWidth: thickness, borderStyle: 'solid', borderColor: `var(${colorVar})`, borderRightColor: 'transparent', borderRadius: '50%' }}
      role="status"
      aria-live="polite"
      {...rest}
    >
      <span className="sr-only">Loading</span>
    </span>
  );
};
