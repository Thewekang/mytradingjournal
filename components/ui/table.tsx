import React from 'react';
import clsx from 'clsx';

export const Table = ({ className, ...rest }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={clsx('w-full border-collapse text-sm', className)} {...rest} />
);
export const THead = ({ className, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={clsx('bg-[var(--color-bg-alt)] text-[var(--color-muted)] text-xs', className)} {...rest} />
);
export const TBody = ({ className, ...rest }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={clsx('divide-y divide-[var(--color-border)]', className)} {...rest} />
);
export const TR = ({ className, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={clsx('hover:bg-[var(--color-bg-alt)]/60 transition-colors', className)} {...rest} />
);
export const TH = ({ className, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={clsx('text-left font-semibold px-3 py-2', className)} {...rest} />
);
export const TD = ({ className, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={clsx('px-3 py-1 align-middle', className)} {...rest} />
);
