import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Dialog } from '@/components/ui/dialog';

describe('Dialog focus restoration edge cases', () => {
  it('restores focus even if opener loses focus before close', () => {
    function Demo(){
      const [open,setOpen] = React.useState(false);
      return <>
        <button onClick={()=>setOpen(true)} data-testid="opener">Open</button>
        {open && <Dialog open={open} onOpenChange={setOpen} title="Sample"><button data-testid="inside">Inside</button></Dialog>}
        <input placeholder="field" data-testid="field" />
      </>;
    }
    render(<Demo/>);
    const opener = screen.getByTestId('opener');
    opener.focus();
    fireEvent.click(opener);
    const inside = screen.getByTestId('inside');
    inside.focus();
    // move focus outside artificially while dialog open
    const field = screen.getByTestId('field');
    field.focus();
    // close via Escape
    fireEvent.keyDown(document,{key:'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();
    // Opener should receive focus (original opener)
    expect(document.activeElement).toBe(opener);
  });
});
