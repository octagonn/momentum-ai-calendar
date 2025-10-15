#!/usr/bin/env node

/**
 * Add redirect URL to Supabase via API
 * 
 * This script adds the momentum:// redirect URL to your Supabase project
 * if the dashboard won't accept it due to validation issues.
 */

console.log('\n🔧 Supabase Redirect URL Helper\n');
console.log('=' .repeat(60));

console.log('\n📋 Manual Steps to Add Redirect URL:\n');

console.log('Option 1: Try these formats in the dashboard:');
console.log('   • momentum://*');
console.log('   • momentum://**');
console.log('   • momentum://auth/callback\n');

console.log('Option 2: Use Supabase CLI:');
console.log('   1. Install: npm install -g supabase');
console.log('   2. Login: supabase login');
console.log('   3. Link project: supabase link');
console.log('   4. Update config:\n');

console.log(`
// In supabase/config.toml, add:
[auth]
site_url = "https://rork.com"
additional_redirect_urls = [
  "momentum://auth/callback",
  "https://rork.com/auth/callback"
]
`);

console.log('\nOption 3: Contact Supabase Support:');
console.log('   If dashboard validation is blocking you, contact support');
console.log('   to have them add the custom scheme URL manually.\n');

console.log('=' .repeat(60));

console.log('\n💡 Workaround: Use HTTPS URL for now\n');

console.log('You can temporarily use the HTTPS fallback:');
console.log('   • Add: https://rork.com/auth/callback');
console.log('   • This will work in browsers');
console.log('   • Deep links will still work via associated domains\n');

console.log('The app is configured to handle both:');
console.log('   ✓ momentum:// (direct deep link)');
console.log('   ✓ https://rork.com/ (universal link)\n');

console.log('=' .repeat(60));

console.log('\n✨ Recommended Next Steps:\n');

console.log('1. Try entering: momentum://*');
console.log('2. If that fails, add: https://rork.com/auth/callback');
console.log('3. Test with the HTTPS URL first');
console.log('4. Contact Supabase if custom scheme is blocked\n');

console.log('=' .repeat(60));
console.log('\n');

