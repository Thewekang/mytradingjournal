"use client";
import React from 'react';
import clsx from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: boolean;
  width?: number | string;
  height?: number | string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, rounded=true, width, height, style, ...rest }) => {
  return (
    <div
      className={clsx('relative overflow-hidden bg-[var(--color-bg-muted)]/70', rounded && 'rounded-md', className)}
      style={{ width, height, ...style }}
      aria-hidden
      {...rest}
    >
      <div className="absolute inset-0 animate-[skeleton_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

// keyframes via global layer (added if not present)
