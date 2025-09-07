#!/usr/bin/env node

/**
 * Direct test of the cron endpoint to debug the exit code 20 issue
 */

import { execSync } from 'child_process';

const secrets = {
  CRON_SECRET: '62ac6e07792fe13d18155425c82f74a36f7e3f26d68a7a518d6925fe992f7cf1',
  CRON_EQUITY_REBUILD_URL: 'https://mytradingjournal-iota.vercel.app/api/cron/equity-rebuild',
  VERCEL_BYPASS_SECRET: 'dfbdb96922a1373624e25b8b09222982'
};

console.log('🔍 Direct Cron Endpoint Test');
console.log('============================\n');

console.log('Testing endpoint:', secrets.CRON_EQUITY_REBUILD_URL);
console.log('Using secrets from your configuration\n');

try {
  // Test with PowerShell Invoke-WebRequest (more reliable on Windows)
  const psCommand = `
    try {
      $headers = @{
        "x-cron-secret" = "${secrets.CRON_SECRET}";
        "x-vercel-protection-bypass" = "${secrets.VERCEL_BYPASS_SECRET}";
        "Content-Type" = "application/json"
      }
      $response = Invoke-WebRequest -Uri "${secrets.CRON_EQUITY_REBUILD_URL}" -Method POST -Headers $headers -TimeoutSec 30
      Write-Output "STATUS:$($response.StatusCode)"
      Write-Output "BODY:$($response.Content)"
    } catch {
      Write-Output "STATUS:$($_.Exception.Response.StatusCode.value__)"
      Write-Output "ERROR:$($_.Exception.Message)"
      if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Output "BODY:$responseBody"
      }
    }
  `.replace(/\s+/g, ' ').trim();

  console.log('Making request to cron endpoint...');
  const result = execSync(`powershell -Command "${psCommand}"`, { 
    encoding: 'utf8', 
    stdio: 'pipe' 
  });

  console.log('Raw response:', result);

  const lines = result.split('\n');
  const statusLine = lines.find(line => line.startsWith('STATUS:'));
  const bodyLine = lines.find(line => line.startsWith('BODY:'));
  const errorLine = lines.find(line => line.startsWith('ERROR:'));

  if (statusLine) {
    const status = statusLine.replace('STATUS:', '').trim();
    console.log(`\n✅ HTTP Status: ${status}`);
    
    if (bodyLine) {
      const body = bodyLine.replace('BODY:', '').trim();
      console.log('Response Body:', body);
    }
    
    if (errorLine) {
      const error = errorLine.replace('ERROR:', '').trim();
      console.log('Error Details:', error);
    }

    // Analyze the status
    const statusCode = parseInt(status);
    if (statusCode >= 200 && statusCode < 300) {
      console.log('🎉 Success! Cron endpoint is working correctly.');
    } else if (statusCode === 401) {
      console.log('🔐 Authentication issue - check CRON_SECRET');
    } else if (statusCode === 403) {
      console.log('🚫 Forbidden - check VERCEL_BYPASS_SECRET');
    } else if (statusCode === 405) {
      console.log('📝 Method not allowed - endpoint might not support POST or require different headers');
    } else if (statusCode >= 400 && statusCode < 500) {
      console.log('⚠️ Client error - check request format and authentication');
    } else if (statusCode >= 500) {
      console.log('💥 Server error - issue on Vercel/application side');
    }
  }

} catch (error) {
  console.error('❌ Test failed:', error.message);
}

console.log('\n💡 Next Steps:');
console.log('==============');
console.log('1. Check the GitHub Actions logs for more details');
console.log('2. Verify the cron endpoint exists at: https://mytradingjournal-iota.vercel.app/api/cron/equity-rebuild');
console.log('3. Check Vercel function logs in your dashboard');
console.log('4. Ensure the endpoint expects POST requests with those headers');
