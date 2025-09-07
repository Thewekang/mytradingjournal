#!/usr/bin/env node

/**
 * Final secrets validation with correct IDs
 */

import { execSync } from 'child_process';

console.log('🎯 Final Secrets Validation');
console.log('===========================\n');

const secrets = {
  CRON_SECRET: '62ac6e07792fe13d18155425c82f74a36f7e3f26d68a7a518d6925fe992f7cf1',
  CRON_EQUITY_REBUILD_URL: 'https://mytradingjournal-iota.vercel.app/api/cron/equity-rebuild',
  VERCEL_BYPASS_SECRET: 'dfbdb96922a1373624e25b8b09222982',
  VERCEL_TOKEN: 'BLznZ83M7jvEbvv3stoPRShH',
  VERCEL_PROJECT_ID: 'prj_KJOfgUWNwlXiDDY2TeCGi3w49rIl', // From your settings
  CORRECT_TEAM_ID: 'wekangs-projects', // From vercel teams ls
  USER_ID: 'YJzo2utCr6XJlDmcarwZKKV2'
};

console.log('Discovery Results:');
console.log('- Your Vercel username: norh4mim-5877');
console.log('- Your project name: mytradingjournal');  
console.log('- Your team ID: wekangs-projects');
console.log('- Production URL: https://mytradingjournal-iota.vercel.app\n');

// Test with the correct team scope
console.log('✅ Testing with correct team scope (wekangs-projects)...');
try {
  const projects = execSync(
    `vercel ls --yes --token="${secrets.VERCEL_TOKEN}" --scope="wekangs-projects"`, 
    { encoding: 'utf8', stdio: 'pipe' }
  );
  console.log('✅ Team scope "wekangs-projects" works!');
  console.log('Projects found:', projects.includes('mytradingjournal') ? '✅ mytradingjournal found' : '❌ mytradingjournal not found');
} catch (error) {
  console.log('❌ Team scope failed:', error.message);
}

// Test project pull with correct scope
console.log('\n✅ Testing vercel pull with correct scope...');
try {
  execSync(
    `vercel pull --yes --environment=preview --token="${secrets.VERCEL_TOKEN}" --scope="wekangs-projects"`, 
    { encoding: 'utf8', stdio: 'pipe' }
  );
  console.log('✅ Vercel pull works with wekangs-projects scope!');
} catch (error) {
  console.log('❌ Vercel pull failed:', error.message);
}

console.log('\n🎯 FINAL GITHUB SECRETS CONFIGURATION:');
console.log('======================================');
console.log('Use these EXACT values in your GitHub repository secrets:');
console.log('');
console.log('CRON_SECRET =', secrets.CRON_SECRET);
console.log('CRON_EQUITY_REBUILD_URL =', secrets.CRON_EQUITY_REBUILD_URL);
console.log('VERCEL_BYPASS_SECRET =', secrets.VERCEL_BYPASS_SECRET);
console.log('VERCEL_TOKEN =', secrets.VERCEL_TOKEN);
console.log('VERCEL_PROJECT_ID =', secrets.VERCEL_PROJECT_ID);
console.log('VERCEL_ORG_ID = wekangs-projects');
console.log('');
console.log('✅ The key discovery: Use "wekangs-projects" as VERCEL_ORG_ID');
console.log('   (NOT the team_xxx or user ID from Vercel settings)');
