#!/usr/bin/env node

/**
 * Test actual secrets with real values
 * This will help determine the correct VERCEL_ORG_ID
 */

import { execSync } from 'child_process';

const secrets = {
  CRON_SECRET: '62ac6e07792fe13d18155425c82f74a36f7e3f26d68a7a518d6925fe992f7cf1',
  CRON_EQUITY_REBUILD_URL: 'https://mytradingjournal-iota.vercel.app/api/cron/equity-rebuild',
  VERCEL_BYPASS_SECRET: 'dfbdb96922a1373624e25b8b09222982',
  VERCEL_TOKEN: 'BLznZ83M7jvEbvv3stoPRShH',
  VERCEL_PROJECT_ID: 'prj_KJOfgUWNwlXiDDY2TeCGi3w49rIl',
  // We'll test both possibilities
  TEAM_ID: 'team_kjnkxn5ytOXcTiPVblGZdFWB',
  USER_ID: 'YJzo2utCr6XJlDmcarwZKKV2'
};

console.log('🔍 Testing Real Secrets Configuration');
console.log('====================================\n');

// Test 1: Vercel Authentication
console.log('1️⃣  Testing Vercel authentication...');
try {
  const whoami = execSync(`vercel whoami --token="${secrets.VERCEL_TOKEN}"`, { 
    encoding: 'utf8', 
    stdio: 'pipe' 
  }).trim();
  console.log(`✅ Authenticated as: ${whoami}`);
} catch (error) {
  console.log('❌ Vercel authentication failed');
  console.log('   Error:', error.message);
  process.exit(1);
}

// Test 2: Project access with Team ID
console.log('\n2️⃣  Testing project access with Team ID...');
try {
  const projectsWithTeam = execSync(
    `vercel ls --yes --token="${secrets.VERCEL_TOKEN}" --scope="${secrets.TEAM_ID}"`, 
    { encoding: 'utf8', stdio: 'pipe' }
  );
  console.log('✅ Team ID works! Projects retrieved successfully');
  
  if (projectsWithTeam.includes(secrets.VERCEL_PROJECT_ID)) {
    console.log(`✅ Project ${secrets.VERCEL_PROJECT_ID} found with Team ID`);
    console.log('🎯 RECOMMENDATION: Use Team ID as VERCEL_ORG_ID');
  } else {
    console.log(`⚠️  Project ${secrets.VERCEL_PROJECT_ID} not found with Team ID`);
  }
} catch (error) {
  console.log('❌ Team ID failed');
  console.log('   Error:', error.stderr || error.message);
}

// Test 3: Personal account (no scope needed for personal projects)
console.log('\n3️⃣  Testing personal account projects...');
try {
  const personalProjects = execSync(
    `vercel ls --yes --token="${secrets.VERCEL_TOKEN}"`, 
    { encoding: 'utf8', stdio: 'pipe' }
  );
  console.log('✅ Personal account works! Projects retrieved successfully');
  
  if (personalProjects.includes(secrets.VERCEL_PROJECT_ID)) {
    console.log(`✅ Project ${secrets.VERCEL_PROJECT_ID} found in personal account`);
    console.log('🎯 RECOMMENDATION: Use User ID as VERCEL_ORG_ID');
  } else {
    console.log(`⚠️  Project ${secrets.VERCEL_PROJECT_ID} not found in personal account`);
  }
} catch (error) {
  console.log('❌ Personal account failed');
  console.log('   Error:', error.stderr || error.message);
}

// Test 4: Cron endpoint test  
console.log('\n4️⃣  Testing cron endpoint...');
try {
  // First, test if endpoint is reachable (PowerShell compatible)
  const testResponse = execSync(
    `powershell -Command "try { (Invoke-WebRequest -Uri '${secrets.CRON_EQUITY_REBUILD_URL}' -Method GET -TimeoutSec 10).StatusCode } catch { $_.Exception.Response.StatusCode.value__ }"`,
    { encoding: 'utf8', stdio: 'pipe' }
  ).trim();
  
  console.log(`✅ Endpoint reachable (HTTP ${testResponse})`);
  
  if (testResponse === '401' || testResponse === '403' || testResponse === '405') {
    console.log('   ✅ This is expected - endpoint requires POST with authentication');
  }
  
} catch (error) {
  console.log('❌ Cron endpoint test failed');
  console.log('   Error:', error.message);
}

console.log('\n📋 Final Recommendations:');
console.log('=========================');
console.log('Based on the tests above, use these values in GitHub Secrets:');
console.log(`CRON_SECRET: ${secrets.CRON_SECRET}`);
console.log(`CRON_EQUITY_REBUILD_URL: ${secrets.CRON_EQUITY_REBUILD_URL}`);
console.log(`VERCEL_BYPASS_SECRET: ${secrets.VERCEL_BYPASS_SECRET}`);
console.log(`VERCEL_TOKEN: ${secrets.VERCEL_TOKEN}`);
console.log(`VERCEL_PROJECT_ID: ${secrets.VERCEL_PROJECT_ID}`);
console.log('VERCEL_ORG_ID: [Check the test results above to see which ID worked]');
