"use client";
import React from 'react';

let idCounter = 0;
function nextId() { return `tt-${++idCounter}`; }

export interface TooltipProps {
  content: React.ReactNode;
  /** Delay (ms) before showing on hover */
  delay?: number;
  /** Optional id (else auto) */
  id?: string;
  /** Placement preference (currently only top|bottom, auto flips) */
  placement?: 'top' | 'bottom';
  children: React.ReactElement;
}

/**
 * Accessible tooltip: appears on hover/focus, dismissed on blur/escape.
 * Uses aria-describedby on trigger. Content is not focusable.
 */
export function Tooltip({ content, delay = 250, id, placement = 'top', children }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);
  const tooltipId = React.useRef(id || nextId());
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { setMounted(true); return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); }; }, []);

  function show() {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setVisible(true), delay);
  }
  function hide() {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setVisible(false);
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') hide();
  }

  // Positioning (basic): center horizontally relative to trigger, flip if insufficient viewport space.
  React.useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !containerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const el = containerRef.current;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const preferredTop = placement === 'top'
      ? triggerRect.top + scrollY - el.offsetHeight - 8
      : triggerRect.bottom + scrollY + 8;
    let top = preferredTop;
    // Flip logic if top placement goes off screen
    if (placement === 'top' && preferredTop < scrollY) {
      top = triggerRect.bottom + scrollY + 8; // flip below
    }
    if (placement === 'bottom' && (preferredTop + el.offsetHeight) > (scrollY + window.innerHeight)) {
      top = triggerRect.top + scrollY - el.offsetHeight - 8; // flip above
    }
    const left = triggerRect.left + scrollX + (triggerRect.width / 2) - (el.offsetWidth / 2);
    el.style.top = `${Math.max(scrollY + 4, top)}px`;
    el.style.left = `${Math.max(4, left)}px`;
  }, [visible, placement]);

  const childEl = children as React.ReactElement<Record<string, unknown>>;
  type HandlerProps = {
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    tabIndex?: number;
    [k: string]: unknown;
  };
  const prevProps: HandlerProps = childEl.props || {} as HandlerProps;
  const trigger = React.cloneElement(childEl, {
    ref: (node: HTMLElement) => {
      triggerRef.current = node;
      const anyChild = childEl as unknown as { ref?: React.Ref<HTMLElement> };
      const childRef = anyChild.ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef && typeof childRef === 'object') (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    onMouseEnter: (e: React.MouseEvent) => { prevProps.onMouseEnter?.(e); show(); },
    onMouseLeave: (e: React.MouseEvent) => { prevProps.onMouseLeave?.(e); hide(); },
    onFocus: (e: React.FocusEvent) => { prevProps.onFocus?.(e); show(); },
    onBlur: (e: React.FocusEvent) => { prevProps.onBlur?.(e); hide(); },
    onKeyDown: (e: React.KeyboardEvent) => { prevProps.onKeyDown?.(e); handleKey(e); },
    'aria-describedby': visible ? tooltipId.current : undefined,
    tabIndex: prevProps.tabIndex ?? 0,
  });

  return (
    <>
      {trigger}
      {mounted && visible && (
        <div
          ref={containerRef}
          id={tooltipId.current}
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-xs rounded-md px-2 py-1 text-[11px] leading-snug shadow-sm bg-[color:var(--color-bg-muted)] text-[color:var(--color-text)] border border-[color:var(--color-border-strong)] animate-in fade-in duration-150"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        >
          {content}
        </div>
      )}
    </>
  );
}
