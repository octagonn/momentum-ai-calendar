/**
 * Setup script for AI Goals functionality
 * This script helps configure the necessary environment variables and dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up AI Goals functionality...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  
  const envContent = `# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Edge Function URL
EXPO_PUBLIC_EDGE_URL=your_supabase_edge_url_here

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-pro

# Expo Configuration
EXPO_PUBLIC_PROJECT_ID=your_expo_project_id_here
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file already exists');
}

// Check package.json for required dependencies
console.log('\n📦 Checking dependencies...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredDeps = [
  'react-native-calendars',
  'expo-notifications',
  'expo-device',
  'date-fns',
  'date-fns-tz',
  'zod'
];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

if (missingDeps.length > 0) {
  console.log('❌ Missing dependencies:', missingDeps.join(', '));
  console.log('Run: npm install ' + missingDeps.join(' '));
} else {
  console.log('✅ All required dependencies are installed');
}

// Check if Supabase is configured
console.log('\n🗄️ Checking Supabase configuration...');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('EXPO_PUBLIC_SUPABASE_URL=') && !envContent.includes('your_supabase_url_here');
  const hasSupabaseKey = envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY=') && !envContent.includes('your_supabase_anon_key_here');
  
  if (hasSupabaseUrl && hasSupabaseKey) {
    console.log('✅ Supabase configuration found');
  } else {
    console.log('❌ Supabase configuration incomplete');
    console.log('   Please update your .env file with your Supabase credentials');
  }
} else {
  console.log('❌ .env file not found');
}

// Check if Gemini is configured
console.log('\n🤖 Checking Gemini configuration...');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasGeminiKey = envContent.includes('GEMINI_API_KEY=') && !envContent.includes('your_gemini_api_key_here');
  
  if (hasGeminiKey) {
    console.log('✅ Gemini configuration found');
  } else {
    console.log('❌ Gemini configuration incomplete');
    console.log('   Please update your .env file with your Gemini API key');
  }
} else {
  console.log('❌ .env file not found');
}

console.log('\n📋 Next steps:');
console.log('1. Update your .env file with the correct credentials');
console.log('2. Run: npm install (if dependencies are missing)');
console.log('3. Run: npx expo start');
console.log('4. Test the AI Goals feature in the app');

console.log('\n🎯 AI Goals Setup Complete!');
console.log('\nFeatures included:');
console.log('- ✅ AI-powered goal creation with interview engine');
console.log('- ✅ Automatic task scheduling based on user preferences');
console.log('- ✅ Calendar integration with task visualization');
console.log('- ✅ Progress tracking with real-time updates');
console.log('- ✅ Push notifications for task reminders');
console.log('- ✅ Supabase integration with RLS policies');
console.log('- ✅ Gemini AI integration for plan generation');

