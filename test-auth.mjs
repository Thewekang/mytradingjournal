import { prisma } from './lib/prisma.js';
import { compare } from 'bcryptjs';

async function testAuth() {
  console.log('Testing authentication...');
  
  const email = 'admin@example.com';
  const password = 'admin123';
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    console.log('User found:', !!user);
    
    if (user) {
      console.log('User email:', user.email);
      console.log('Has passwordHash:', !!user.passwordHash);
      
      if (user.passwordHash) {
        const valid = await compare(password, user.passwordHash);
        console.log('Password valid:', valid);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
