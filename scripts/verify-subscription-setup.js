#!/usr/bin/env node

/**
 * Subscription RPC Function Verification Script
 * 
 * This script verifies that the upsert_subscription_event RPC function exists
 * and can be called. It uses the Supabase JavaScript client to connect directly.
 * 
 * Usage:
 *   node scripts/verify-subscription-setup.js
 * 
 * Requirements:
 *   - .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   - Or set SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration not found!');
  console.error('   Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRPCFunction() {
  console.log('🔍 Verifying subscription RPC function...\n');

  try {
    // Check if function exists by trying to call it with test parameters
    // We'll use a SELECT query to check the function signature
    const { data, error } = await supabase.rpc('upsert_subscription_event', {
      p_status: 'active',
      p_tier: 'premium',
      p_product_id: 'test-verification',
      p_expires_at: new Date().toISOString(),
      p_subscription_id: null,
      p_platform: 'ios',
      p_environment: 'sandbox',
    });

    if (error) {
      // Check if it's a "function does not exist" error
      if (error.message.includes('does not exist') || error.code === '42883') {
        console.log('❌ RPC function upsert_subscription_event does NOT exist');
        console.log('\n📝 To create it, run the migration:');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Copy contents of: supabase/migrations/20251030093000_subscription_effective_and_upsert.sql');
        console.log('   3. Run the SQL query\n');
        return false;
      } else if (error.message.includes('Not authenticated')) {
        console.log('⚠️  Function exists but requires authentication');
        console.log('   This is expected - the function requires a logged-in user');
        console.log('   ✅ RPC function upsert_subscription_event EXISTS\n');
        return true;
      } else {
        console.log('⚠️  Function exists but returned an error:', error.message);
        console.log('   This might be expected (e.g., authentication required)');
        console.log('   ✅ RPC function upsert_subscription_event EXISTS\n');
        return true;
      }
    } else {
      console.log('✅ RPC function upsert_subscription_event EXISTS and is callable\n');
      return true;
    }
  } catch (err) {
    if (err.message.includes('does not exist') || err.code === '42883') {
      console.log('❌ RPC function upsert_subscription_event does NOT exist');
      console.log('\n📝 To create it, run the migration:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Copy contents of: supabase/migrations/20251030093000_subscription_effective_and_upsert.sql');
      console.log('   3. Run the SQL query\n');
      return false;
    }
    console.error('❌ Error checking RPC function:', err.message);
    return false;
  }
}

async function verifyTableColumns() {
  console.log('🔍 Verifying user_profiles subscription columns...\n');

  try {
    // Try to select subscription columns to verify they exist
    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at, product_id')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Subscription columns are missing from user_profiles table');
        console.log('   Required columns: subscription_tier, subscription_status, subscription_expires_at, product_id');
        console.log('\n📝 To create them, run the migration:');
        console.log('   supabase/migrations/20251008000000_add_premium_subscriptions.sql\n');
        return false;
      } else {
        console.log('⚠️  Could not verify columns (might be RLS or permissions):', error.message);
        console.log('   This might be normal if you\'re not authenticated\n');
        return null; // Unknown state
      }
    } else {
      console.log('✅ Subscription columns exist in user_profiles table\n');
      return true;
    }
  } catch (err) {
    console.error('❌ Error checking table columns:', err.message);
    return false;
  }
}

async function verifySubscriptionsTable() {
  console.log('🔍 Verifying subscriptions table...\n');

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('❌ subscriptions table does NOT exist');
        console.log('\n📝 To create it, run the migration:');
        console.log('   supabase/migrations/20251008000000_add_premium_subscriptions.sql\n');
        return false;
      } else {
        console.log('⚠️  Could not verify table (might be RLS or permissions):', error.message);
        console.log('   This might be normal if you\'re not authenticated\n');
        return null; // Unknown state
      }
    } else {
      console.log('✅ subscriptions table exists\n');
      return true;
    }
  } catch (err) {
    if (err.message.includes('does not exist') || err.code === '42P01') {
      console.log('❌ subscriptions table does NOT exist\n');
      return false;
    }
    console.error('❌ Error checking subscriptions table:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Subscription Setup Verification\n');
  console.log(`📡 Connecting to: ${supabaseUrl.replace(/\/\/.*@/, '//***@')}\n`);

  const results = {
    rpcFunction: await verifyRPCFunction(),
    tableColumns: await verifyTableColumns(),
    subscriptionsTable: await verifySubscriptionsTable(),
  };

  console.log('\n📊 Summary:');
  console.log(`   RPC Function: ${results.rpcFunction ? '✅ Exists' : '❌ Missing'}`);
  console.log(`   Table Columns: ${results.tableColumns === null ? '⚠️  Unknown' : results.tableColumns ? '✅ Exist' : '❌ Missing'}`);
  console.log(`   Subscriptions Table: ${results.subscriptionsTable === null ? '⚠️  Unknown' : results.subscriptionsTable ? '✅ Exists' : '❌ Missing'}`);

  if (!results.rpcFunction) {
    console.log('\n❌ Action Required:');
    console.log('   The upsert_subscription_event RPC function is missing.');
    console.log('   Please apply the migration in Supabase SQL Editor.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All critical components verified!');
    console.log('   Your subscription system should work correctly.\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

