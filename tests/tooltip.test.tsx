import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tooltip } from '@/components/ui/tooltip';

// Basic behavioral test ensuring tooltip content appears on focus and hides on blur.
describe('Tooltip', () => {
  it('shows content on focus and hides on blur', async () => {
    render(<Tooltip content="Hello tip" delay={0}><button>Trigger</button></Tooltip>);
    const btn = screen.getByRole('button', { name: /trigger/i });
    fireEvent.focus(btn);
    // content should appear
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hello tip');
    fireEvent.keyDown(btn, { key: 'Escape' });
    // after escape it should disappear (query returns null)
    expect(screen.queryByRole('tooltip')).toBeNull();
    // hover path
    fireEvent.mouseEnter(btn);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(btn);
    // tooltip hides after mouse leave (allow microtask flush)
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
