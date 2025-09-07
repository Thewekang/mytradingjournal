import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

describe('Tabs keyboard navigation details', () => {
  it('wraps correctly with ArrowLeft from first and ArrowRight from last', () => {
    render(<Tabs defaultValue="a"><TabsList><TabsTrigger value="a">A</TabsTrigger><TabsTrigger value="b">B</TabsTrigger><TabsTrigger value="c">C</TabsTrigger></TabsList><TabsContent value="a">A</TabsContent><TabsContent value="b">B</TabsContent><TabsContent value="c">C</TabsContent></Tabs>);
    const tablist = screen.getByRole('tablist');
    const tabs = screen.getAllByRole('tab');
    tabs[0].focus();
    fireEvent.keyDown(tablist,{key:'ArrowLeft'}); // wrap to last
    expect(tabs[2]).toHaveAttribute('aria-selected','true');
    fireEvent.keyDown(tablist,{key:'ArrowRight'}); // wrap to first
    expect(tabs[0]).toHaveAttribute('aria-selected','true');
  });
});
