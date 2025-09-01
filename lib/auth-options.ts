import { PrismaAdapter } from '@next-auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import { NextAuthOptions, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

type UserRole = 'USER' | 'ADMIN';
interface AuthToken extends JWT { uid?: string; role?: UserRole }

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {},
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.passwordHash) return null;
        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role } as unknown as User;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      // Persist user id / role into token
      if (user) {
        (token as AuthToken).uid = (user as User & { id: string }).id;
  (token as AuthToken).role = (user as User & { role?: UserRole }).role ?? 'USER';
      } else if (!(token as AuthToken).role) {
        (token as AuthToken).role = 'USER';
      }
  return token as AuthToken;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as unknown as { id: string; role: string }).id = (token as AuthToken).uid ?? '';
        (session.user as unknown as { id: string; role: string }).role = (token as AuthToken).role ?? 'USER';
      }
      return session;
    }
  }
};
