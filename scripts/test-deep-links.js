#!/usr/bin/env node

/**
 * Deep Link Testing Script
 * 
 * This script helps you test deep link configuration for your Momentum app.
 * It generates test URLs that you can use to verify deep linking works correctly.
 */

const APP_SCHEME = 'momentum';
const AUTH_CALLBACK_PATH = 'auth/callback';

console.log('\n🔗 Deep Link Testing Helper\n');
console.log('=' .repeat(60));

// Generate sample deep link URLs
const generateTestUrls = () => {
  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.token';
  const sampleRefreshToken = 'sample-refresh-token-here';
  
  return {
    basic: `${APP_SCHEME}://${AUTH_CALLBACK_PATH}`,
    withTokens: `${APP_SCHEME}://${AUTH_CALLBACK_PATH}?access_token=${sampleToken}&refresh_token=${sampleRefreshToken}&type=signup`,
    withError: `${APP_SCHEME}://${AUTH_CALLBACK_PATH}?error=access_denied&error_description=User%20cancelled%20the%20request`,
  };
};

const urls = generateTestUrls();

console.log('\n📱 Test URLs for Different Scenarios:\n');

console.log('1. Basic auth callback (no params):');
console.log(`   ${urls.basic}\n`);

console.log('2. Successful email verification:');
console.log(`   ${urls.withTokens}\n`);

console.log('3. Error scenario:');
console.log(`   ${urls.withError}\n`);

console.log('=' .repeat(60));

console.log('\n🧪 How to Test:\n');

console.log('iOS Simulator:');
console.log('   xcrun simctl openurl booted "momentum://auth/callback?access_token=test&refresh_token=test"\n');

console.log('Android Emulator:');
console.log('   adb shell am start -W -a android.intent.action.VIEW -d "momentum://auth/callback?access_token=test&refresh_token=test"\n');

console.log('iOS Device (via Terminal):');
console.log('   1. Make sure device is connected');
console.log('   2. Run: xcrun devicectl device info apps --device <device-id>');
console.log('   3. Then: open "momentum://auth/callback?access_token=test&refresh_token=test"\n');

console.log('=' .repeat(60));

console.log('\n✅ Verification Checklist:\n');

const checklist = [
  'App scheme is set to "momentum" in app.json',
  'Redirect URL "momentum://auth/callback" is added in Supabase Dashboard',
  'Email templates include "&redirect_to=momentum://auth/callback"',
  'App has been rebuilt after changing app.json (npx expo prebuild --clean)',
  'Deep link listener is active in app/_layout.tsx',
  'Auth callback handler processes URL parameters',
];

checklist.forEach((item, index) => {
  console.log(`   ${index + 1}. ☐ ${item}`);
});

console.log('\n' + '='.repeat(60));

console.log('\n📝 Expected Behavior:\n');
console.log('   1. Click email verification link');
console.log('   2. OS intercepts the momentum:// URL');
console.log('   3. App opens to auth/callback screen');
console.log('   4. Tokens are extracted from URL params');
console.log('   5. Session is created via supabase.auth.setSession()');
console.log('   6. User is redirected to /(tabs)/(home)/home');
console.log('   7. User is logged in ✨\n');

console.log('=' .repeat(60));

console.log('\n🐛 Common Issues:\n');

const issues = [
  {
    issue: 'Link opens browser instead of app',
    solution: 'Rebuild app after changing app.json: npx expo prebuild --clean'
  },
  {
    issue: 'App opens but shows "No session found"',
    solution: 'Check Supabase logs - ensure tokens are in URL and PKCE is enabled'
  },
  {
    issue: 'Invalid redirect URL error',
    solution: 'Add momentum://auth/callback to Supabase Dashboard redirect URLs'
  },
  {
    issue: 'Works in dev but not production',
    solution: 'Rebuild production app: eas build --platform ios/android'
  }
];

issues.forEach((item, index) => {
  console.log(`   ${index + 1}. Issue: ${item.issue}`);
  console.log(`      Solution: ${item.solution}\n`);
});

console.log('=' .repeat(60));

console.log('\n💡 Pro Tips:\n');
console.log('   • Use real email for testing (Gmail, etc.)');
console.log('   • Test on physical device for best results');
console.log('   • Check console logs for "Deep link received:" messages');
console.log('   • Verify Supabase email template has redirect_to parameter');
console.log('   • Test both cold start (app closed) and warm start (app open)\n');

console.log('=' .repeat(60));
console.log('\n✨ Happy Testing! ✨\n');

