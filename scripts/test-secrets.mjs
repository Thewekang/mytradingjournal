#!/usr/bin/env node

/**
 * Local test script to validate secret formats and patterns
 * This helps identify potential issues before running in GitHub Actions
 */

const secrets = {
  // These would be your actual secret values (don't commit real values!)
  CRON_SECRET: process.env.CRON_SECRET || 'test-cron-secret-123',
  CRON_EQUITY_REBUILD_URL: process.env.CRON_EQUITY_REBUILD_URL || 'https://example.vercel.app/api/cron/equity-rebuild',
  VERCEL_BYPASS_SECRET: process.env.VERCEL_BYPASS_SECRET || 'test-bypass-secret-456',
  VERCEL_TOKEN: process.env.VERCEL_TOKEN || 'test-vercel-token-789',
  VERCEL_ORG_ID: process.env.VERCEL_ORG_ID || 'team_test123',
  VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || 'prj_test456'
};

console.log('🔍 Testing Secret Configuration Locally');
console.log('==========================================\n');

// Test 1: Basic secret availability
console.log('1️⃣  Testing secret availability:');
Object.entries(secrets).forEach(([key, value]) => {
  const status = value && value.length > 0 ? '✅' : '❌';
  const length = value ? value.length : 0;
  console.log(`   ${status} ${key}: ${length > 0 ? `${length} characters` : 'MISSING'}`);
});

// Test 2: URL format validation
console.log('\n2️⃣  Testing URL format:');
const url = secrets.CRON_EQUITY_REBUILD_URL;
if (url) {
  try {
    const urlObj = new URL(url);
    console.log(`   ✅ URL is valid: ${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`);
    
    if (urlObj.protocol === 'https:') {
      console.log('   ✅ Using HTTPS (secure)');
    } else {
      console.log('   ⚠️  Not using HTTPS');
    }
    
    if (urlObj.hostname.includes('vercel.app')) {
      console.log('   ✅ Vercel domain detected');
    }
  } catch (error) {
    console.log(`   ❌ Invalid URL format: ${error.message}`);
  }
} else {
  console.log('   ❌ CRON_EQUITY_REBUILD_URL is missing');
}

// Test 3: Secret format validation
console.log('\n3️⃣  Testing secret formats:');

// VERCEL_TOKEN should start with specific prefixes
const token = secrets.VERCEL_TOKEN;
if (token) {
  if (token.startsWith('vercel_') || token.length > 20) {
    console.log('   ✅ VERCEL_TOKEN format looks valid');
  } else {
    console.log('   ⚠️  VERCEL_TOKEN format might be incorrect');
  }
}

// VERCEL_ORG_ID should be alphanumeric with underscores
const orgId = secrets.VERCEL_ORG_ID;
if (orgId && /^[a-zA-Z0-9_]+$/.test(orgId)) {
  console.log('   ✅ VERCEL_ORG_ID format looks valid');
} else if (orgId) {
  console.log('   ⚠️  VERCEL_ORG_ID format might be incorrect');
}

// VERCEL_PROJECT_ID should be alphanumeric with underscores/dashes
const projectId = secrets.VERCEL_PROJECT_ID;
if (projectId && /^[a-zA-Z0-9_-]+$/.test(projectId)) {
  console.log('   ✅ VERCEL_PROJECT_ID format looks valid');
} else if (projectId) {
  console.log('   ⚠️  VERCEL_PROJECT_ID format might be incorrect');
}

// Test 4: Simulate GitHub Actions environment check
console.log('\n4️⃣  Simulating GitHub Actions precheck:');
const nightly_ready = secrets.CRON_SECRET && secrets.CRON_EQUITY_REBUILD_URL && secrets.VERCEL_BYPASS_SECRET;
const preview_ready = secrets.VERCEL_TOKEN && secrets.VERCEL_ORG_ID && secrets.VERCEL_PROJECT_ID;

console.log(`   Nightly workflow ready: ${nightly_ready ? '✅ YES' : '❌ NO'}`);
console.log(`   Preview workflow ready: ${preview_ready ? '✅ YES' : '❌ NO'}`);

console.log('\n📋 Summary:');
console.log('===========');
if (nightly_ready && preview_ready) {
  console.log('🎉 All secrets appear to be configured correctly!');
  console.log('   Your workflows should work properly.');
} else {
  console.log('⚠️  Some secrets are missing or incorrectly formatted.');
  console.log('   Please check your GitHub repository secrets.');
}

console.log('\n💡 Next steps:');
console.log('   1. Check the GitHub Actions run for the test-secrets workflow');
console.log('   2. Go to https://github.com/Thewekang/mytradingjournal/actions');
console.log('   3. Look for the "Test Secrets" workflow run');
console.log('   4. Review the logs to see actual secret availability');
