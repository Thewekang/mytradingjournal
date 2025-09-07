#!/usr/bin/env node

/**
 * Manual Vercel connection test
 * This will test if you can connect to Vercel with your token
 */

import { execSync } from 'child_process';

console.log('🔧 Manual Vercel Connection Test');
console.log('=================================\n');

// Check if Vercel CLI is installed
try {
  const version = execSync('vercel --version', { encoding: 'utf8', stdio: 'pipe' });
  console.log(`✅ Vercel CLI is installed: ${version.trim()}`);
} catch {
  console.log('❌ Vercel CLI is not installed');
  console.log('   Run: npm install -g vercel');
  process.exit(1);
}

// Test environment variables
const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;

if (!token) {
  console.log('❌ VERCEL_TOKEN not set in environment');
  console.log('   Set it with: set VERCEL_TOKEN=your_token_here');
  process.exit(1);
}

console.log('✅ VERCEL_TOKEN is set');

// Test authentication
try {
  console.log('\n🔐 Testing Vercel authentication...');
  const whoami = execSync(`vercel whoami --token="${token}"`, { 
    encoding: 'utf8', 
    stdio: 'pipe' 
  });
  console.log(`✅ Authenticated as: ${whoami.trim()}`);
} catch (error) {
  console.log('❌ Vercel authentication failed');
  console.log('   Error:', error.message);
  process.exit(1);
}

// Test project listing
try {
  console.log('\n📂 Testing project access...');
  const projects = execSync(`vercel ls --token="${token}"`, { 
    encoding: 'utf8', 
    stdio: 'pipe' 
  });
  console.log('✅ Project list retrieved successfully');
  
  if (projectId && projects.includes(projectId)) {
    console.log(`✅ Project ${projectId} found in your projects`);
  } else if (projectId) {
    console.log(`⚠️  Project ${projectId} not found in visible projects`);
    console.log('   This might be normal if the project is in a team scope');
  }
} catch (error) {
  console.log('⚠️  Could not retrieve project list');
  console.log('   Error:', error.message);
}

console.log('\n🎉 Vercel connection test completed!');
console.log('\n💡 To test with your actual secrets:');
console.log('   1. Copy your VERCEL_TOKEN from GitHub secrets');
console.log('   2. Run: set VERCEL_TOKEN=your_actual_token');
console.log('   3. Run: node scripts/manual-vercel-test.mjs');
