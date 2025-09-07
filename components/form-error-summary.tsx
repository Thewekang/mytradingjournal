"use client";
import React from 'react';

export interface FormErrorSummaryProps {
  errors: Record<string, string>;
  fieldOrder?: string[]; // optional ordering of field keys
  heading?: string;
  onLinkFocus?: (fieldId: string) => void;
}

// Accessible form-level error summary: focuses itself on mount when errors appear; links jump to fields.
export function FormErrorSummary({ errors, fieldOrder, heading = 'Please fix the following errors:', onLinkFocus }: FormErrorSummaryProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const keys = fieldOrder ? fieldOrder.filter(k => errors[k]) : Object.keys(errors);
  React.useEffect(() => {
    if (keys.length && ref.current) {
      // focus container for screen reader announcement
      ref.current.focus();
    }
  }, [keys.length]);
  if (!keys.length) return null;
  return (
  <div ref={ref} role="alert" aria-live="assertive" tabIndex={-1} className="mb-3 p-3 rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-inset)] text-[11px] text-status-danger focus-ring">
      <p className="font-medium mb-1">{heading}</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {keys.map(k => (
          <li key={k}>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(k);
                if (el) {
                  (el as HTMLElement).focus();
                  onLinkFocus?.(k);
                }
              }}
              className="underline text-status-danger focus-ring rounded px-0.5"
            >{errors[k]}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FormErrorSummary;
