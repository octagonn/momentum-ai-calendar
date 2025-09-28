#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Momentum App...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `# Expo Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EXPO_PUBLIC_RORK_API_BASE_URL=http://localhost:3001

# Backend Configuration
PORT=3001

# Optional: Gemini API for AI features
GEMINI_API_KEY=your_gemini_api_key_here
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file already exists');
}

console.log('\n📦 Installing dependencies...');
console.log('Run: npm install');
console.log('\n🚀 Starting development server...');
console.log('Run: npm run dev');
console.log('\n📱 Or start individually:');
console.log('  Backend: npm run server');
console.log('  Frontend: npm start');
console.log('\n✨ Setup complete!');


