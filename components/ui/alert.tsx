import React from 'react';
import clsx from 'clsx';
import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface BaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {}
export interface AlertProps extends BaseProps {
  variant?: AlertVariant;
  heading?: React.ReactNode; // renamed from title
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  size?: 'sm' | 'md';
}

const variantStyles: Record<AlertVariant,string> = {
  info: 'bg-[var(--color-info)]/10 border border-[var(--color-info)]/40 text-[var(--color-info)]',
  success: 'bg-[var(--color-success)]/10 border border-[var(--color-success)]/40 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/40 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 text-[var(--color-danger)]'
};

const iconDefaults: Record<AlertVariant,React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  danger: <XCircle className="h-4 w-4" />
};

const sizeMap = {
  sm: 'text-xs py-2 px-3 gap-2',
  md: 'text-sm py-3 px-4 gap-3'
};

export const Alert: React.FC<AlertProps> = ({ variant='info', heading, icon, children, className, dismissible=false, onDismiss, size='md', ...rest }) => {
  return (
    <div role="alert" className={clsx('rounded-md flex items-start', variantStyles[variant], sizeMap[size], className)} {...rest}>
      <div className="mt-0.5">{icon ?? iconDefaults[variant]}</div>
      <div className="flex-1 min-w-0">
        {heading && <div className="font-semibold mb-0.5 leading-snug">{heading}</div>}
        {children && <div className="leading-snug text-[0.8em] opacity-90">{children}</div>}
      </div>
      {dismissible && (
  <button type="button" aria-label="Dismiss" onClick={onDismiss} className="ml-2 text-current/70 hover:text-current focus-ring rounded">
          ×
        </button>
      )}
    </div>
  );
};