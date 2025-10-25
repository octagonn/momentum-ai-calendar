#!/usr/bin/env node

/**
 * IAP Debug Test Script
 * 
 * This script helps debug in-app purchase issues by testing the IAP setup
 * and providing detailed logging information.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 IAP Debug Test Script');
console.log('========================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the project root.');
  process.exit(1);
}

console.log('📦 Checking project setup...');

// Check package.json for react-native-iap
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (dependencies['react-native-iap']) {
    console.log('✅ react-native-iap is installed:', dependencies['react-native-iap']);
  } else {
    console.log('❌ react-native-iap is not installed');
  }
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
}

// Check app.json for IAP configuration
console.log('\n📱 Checking app configuration...');
try {
  const appJsonPath = path.join(process.cwd(), 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.expo?.plugins?.includes('expo-in-app-purchases')) {
      console.log('✅ expo-in-app-purchases plugin is configured');
    } else {
      console.log('⚠️  expo-in-app-purchases plugin not found in app.json');
    }
    
    if (appJson.expo?.extra?.iosPremiumSkus) {
      console.log('✅ iOS Premium SKUs configured:', appJson.expo.extra.iosPremiumSkus);
    } else {
      console.log('⚠️  iOS Premium SKUs not configured in app.json');
    }
  } else {
    console.log('❌ app.json not found');
  }
} catch (error) {
  console.error('❌ Error reading app.json:', error.message);
}

// Check for IAP-related files
console.log('\n📁 Checking IAP-related files...');
const iapFiles = [
  'lib/iap-wrapper.ts',
  'services/subscriptionService.ts',
  'app/components/PremiumUpgradeModal.tsx'
];

iapFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} not found`);
  }
});

// Check for common IAP issues
console.log('\n🔧 Common IAP Issues Checklist:');
console.log('================================');

const issues = [
  {
    name: 'App Store Connect Configuration',
    description: 'Ensure subscription products are configured in App Store Connect',
    check: () => {
      console.log('⚠️  Manual check required: Verify subscription products in App Store Connect');
      console.log('   - Product ID: com.momentumaicalendar.premium.monthly');
      console.log('   - Status: Ready for Sale');
      console.log('   - Pricing: Configured');
    }
  },
  {
    name: 'TestFlight Configuration',
    description: 'Ensure test users are configured for sandbox testing',
    check: () => {
      console.log('⚠️  Manual check required: Verify TestFlight sandbox users');
      console.log('   - Test user accounts created in App Store Connect');
      console.log('   - Users added to TestFlight');
      console.log('   - Sandbox environment enabled');
    }
  },
  {
    name: 'Bundle ID Match',
    description: 'Ensure bundle ID matches between app and App Store Connect',
    check: () => {
      try {
        const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
        const bundleId = appJson.expo?.ios?.bundleIdentifier;
        if (bundleId) {
          console.log(`✅ Bundle ID found: ${bundleId}`);
          console.log('⚠️  Manual check required: Verify this matches App Store Connect');
        } else {
          console.log('❌ Bundle ID not found in app.json');
        }
      } catch (error) {
        console.log('❌ Error reading bundle ID:', error.message);
      }
    }
  }
];

issues.forEach((issue, index) => {
  console.log(`\n${index + 1}. ${issue.name}`);
  console.log(`   ${issue.description}`);
  issue.check();
});

console.log('\n📋 Debugging Steps:');
console.log('===================');
console.log('1. Check device logs for detailed error messages');
console.log('2. Verify TestFlight build is using the correct bundle ID');
console.log('3. Ensure subscription products are "Ready for Sale" in App Store Connect');
console.log('4. Test with a sandbox user account');
console.log('5. Check that the app is signed with the correct provisioning profile');

console.log('\n🔍 To get detailed logs, run:');
console.log('   npx react-native log-ios');
console.log('   or');
console.log('   npx react-native log-android');

console.log('\n✨ IAP Debug Test Complete!');
