import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FormErrorSummary } from '@/components/form-error-summary';

function FormFixture({ errors }: { errors: Record<string,string> }) {
  return (
    <div>
      <label htmlFor="email">Email</label>
      <input id="email" />
      <label htmlFor="password">Password</label>
      <input id="password" />
      <FormErrorSummary errors={errors} fieldOrder={["email","password"]} />
    </div>
  );
}

describe('FormErrorSummary', () => {
  it('renders nothing with no errors', () => {
    const { container } = render(<FormFixture errors={{}} />);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('focuses alert container on mount when errors present', () => {
    render(<FormFixture errors={{ email: 'Email required'}} />);
    const alert = screen.getByRole('alert');
    expect(document.activeElement).toBe(alert);
  });
  it('clicking error button moves focus to field', () => {
    render(<FormFixture errors={{ email: 'Email required', password: 'Password weak'}} />);
    const btns = screen.getAllByRole('button', { name: /required|weak/ });
    fireEvent.click(btns[1]);
    expect(document.activeElement?.id).toBe('password');
  });
});
