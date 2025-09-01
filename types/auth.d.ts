// Type declarations for modules lacking bundled types in this context
declare module '@next-auth/prisma-adapter';
declare module 'bcryptjs';

// Augment next-auth Session & JWT token to include our custom fields
import 'next-auth';
import 'next-auth/jwt';

export interface SessionUser {
	id: string;
	email: string;
	name?: string | null;
	role: 'USER' | 'ADMIN';
}

declare module 'next-auth' {
	interface Session {
		user?: SessionUser;
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		uid?: string;
		role?: 'USER' | 'ADMIN';
	}
}

// Lightweight helper type guard (can be imported where needed)
// Runtime helper moved to lib/session.ts; this file stays purely declarative.