#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

console.log('🔧 Updating .env file for correct Supabase project...');

try {
  // Read current .env file
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update the Supabase URL
  const updatedContent = envContent.replace(
    /EXPO_PUBLIC_SUPABASE_URL=.*/,
    'EXPO_PUBLIC_SUPABASE_URL=https://tepmvenrjpqcblvavdew.supabase.co'
  );

  // Write updated content
  fs.writeFileSync(envPath, updatedContent);

  console.log('✅ .env file updated successfully!');
  console.log('📝 New Supabase URL: https://tepmvenrjpqcblvavdew.supabase.co');
  console.log('');
  console.log('🔄 Please restart your development server for changes to take effect.');
  console.log('   Run: npm run start');

} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  console.log('');
  console.log('📝 Please manually update your .env file:');
  console.log('   Change: EXPO_PUBLIC_SUPABASE_URL=https://iwbetvsammuvubaememu.supabase.co');
  console.log('   To:     EXPO_PUBLIC_SUPABASE_URL=https://tepmvenrjpqcblvavdew.supabase.co');
}
