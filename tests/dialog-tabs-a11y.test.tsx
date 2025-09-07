import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Basic ARIA / keyboard interaction smoke tests for Dialog & Tabs primitives.

describe('Dialog & Tabs a11y primitives', () => {
  it('dialog sets aria-modal, traps focus, closes on Escape, and restores focus to opener', () => {
    function Demo(){
      const [open,setOpen] = React.useState(false);
      return <>
        <button onClick={()=>setOpen(true)} data-testid="opener">Open</button>
        {open && <Dialog open={open} onOpenChange={setOpen} title="Sample" description="Desc"><button>Inside</button></Dialog>}
        <button>After</button>
      </>;
    }
    render(<Demo/>);
    const opener = screen.getByTestId('opener');
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal','true');
    // Ensure focus is somewhere inside dialog (close button or inner button)
    const active = document.activeElement as HTMLElement | null;
    expect(active).not.toBeNull();
    expect(dialog.contains(active!)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    // Focus restored to opener
    expect(document.activeElement).toBe(opener);
  });

  it('tabs roving focus and arrow/Home/End key navigation', () => {
    render(<Tabs defaultValue="one"><TabsList><TabsTrigger value="one">One</TabsTrigger><TabsTrigger value="two">Two</TabsTrigger><TabsTrigger value="three">Three</TabsTrigger></TabsList><TabsContent value="one">P1</TabsContent><TabsContent value="two">P2</TabsContent><TabsContent value="three">P3</TabsContent></Tabs>);
    const tablist = screen.getByRole('tablist');
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected','true');
    tabs[0].focus();
    fireEvent.keyDown(tablist,{key:'ArrowRight'});
    expect(tabs[1]).toHaveAttribute('aria-selected','true');
    fireEvent.keyDown(tablist,{key:'End'});
    expect(tabs[2]).toHaveAttribute('aria-selected','true');
    fireEvent.keyDown(tablist,{key:'Home'});
    expect(tabs[0]).toHaveAttribute('aria-selected','true');
  });
});
