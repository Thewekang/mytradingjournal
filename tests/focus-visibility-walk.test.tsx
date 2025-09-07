import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';

function Fixture(){
  const [open,setOpen] = React.useState(false);
  return <div>
    <button data-testid="before">Before</button>
    <Tabs defaultValue="a"><TabsList>
      <TabsTrigger value="a">A</TabsTrigger>
      <TabsTrigger value="b">B</TabsTrigger>
    </TabsList><TabsContent value="a">One</TabsContent><TabsContent value="b">Two</TabsContent></Tabs>
    <Input placeholder="Name" />
    <Tooltip content="Tip text"><button data-testid="tip-btn">Tooltip Btn</button></Tooltip>
    <button onClick={()=>setOpen(true)} data-testid="open-dialog">Open Dialog</button>
    {open && <Dialog open={open} onOpenChange={setOpen} title="Dlg"><button>Inside</button></Dialog>}
    <button data-testid="after">After</button>
  </div>;
}

describe('Focus visibility walk', () => {
  it('keyboard tab order yields focusable elements with focus-ring class available', () => {
    render(<Fixture/>);
    const order: HTMLElement[] = [];
    // Simulate tabbing by querying interactive elements (simplified; jsdom lacks full :focus-visible heuristics)
    const selectors = 'button, [role="tab"], input';
    document.querySelectorAll(selectors).forEach(el => order.push(el as HTMLElement));
    expect(order.length).toBeGreaterThan(5);
    // Ensure elements that should have focus-ring class do (tabs triggers, inputs, tooltip trigger, dialog close when opened)
    const tabs = order.filter(el=>el.getAttribute('role')==='tab');
    tabs.forEach(t=>expect(t.className).toContain('focus-ring'));
    const input = order.find(el=>el.tagName==='INPUT');
    expect(input?.className).toContain('focus-ring');
    const tipBtn = screen.getByTestId('tip-btn');
    expect(tipBtn.className).toContain('focus-ring');
  });
});
