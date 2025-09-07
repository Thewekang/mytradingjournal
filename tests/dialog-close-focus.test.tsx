import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Dialog } from '@/components/ui/dialog';

describe('Dialog close button focus ring', () => {
  it('close button includes focus-ring utility', () => {
    render(<Dialog open onOpenChange={()=>{}} title="Title">Body</Dialog>);
    const close = screen.getByRole('button', { name: /close dialog/i });
    expect(close.className).toContain('focus-ring');
  });
});
