// Minimal mock for next-auth getServerSession replacement in route handler tests.
// We avoid importing next-auth test utilities; instead export a helper to wrap handler.
export function mockSession(user: { id: string; role?: string }) {
  return {
    user: { id: user.id, role: user.role ?? 'USER', email: 'test@example.com' }
  } as any;
}