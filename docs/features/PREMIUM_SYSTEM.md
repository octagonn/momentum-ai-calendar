# Premium Subscription System

Complete documentation for the premium subscription system, including implementation details, feature strategy, and user flows.

## Table of Contents

1. [System Overview](#system-overview)
2. [Feature Strategy](#feature-strategy)
3. [Implementation Summary](#implementation-summary)
4. [Database Schema](#database-schema)
5. [User Experience](#user-experience)

---

## System Overview

### High-level Architecture

- **Source of truth**: `public.user_profiles` subscription fields.
- **Effective premium** is resolved by precedence: **admin override** → **active subscription** → **trial** → **free**.
- **Persistence**: Expo Go simulations now persist to Supabase; production purchases update Supabase after receipt verification.

### Database Model

#### `public.user_profiles` (selected fields):
- `subscription_tier` enum: `free | premium | family`
- `subscription_status` enum: `active | expired | cancelled | trialing`
- `subscription_expires_at` timestamptz (nullable; null treated as non-expiring active in some cases)
- `trial_ends_at` timestamptz
- `product_id`, `subscription_id` (optional identifiers)
- Admin override: `admin_premium_tier` (`premium|family`), `admin_premium_until` (timestamp or `'infinity'`)

#### `public.subscriptions` (event log):
- Tracks purchase events: `user_id`, `subscription_id`, `product_id`, `purchase_date`, `expires_date`, `status`, `tier`, `platform`, `environment`.

#### RLS Summary:
- `user_profiles`: users can `SELECT/UPDATE/INSERT` for their own `id = auth.uid()`.
- `subscriptions`: users can `SELECT` their own events; inserts/updates require `auth.uid() = user_id` (done via RPCs or client with row checks).

### Server-side RPCs (Supabase)

These are created as `SECURITY DEFINER` functions and callable from the client.

#### 1) Effective resolver
```sql
select * from public.get_effective_subscription();             -- for current user
select * from public.get_effective_subscription('UUID-HERE');  -- for a specific user
```
Returns: `(effective_tier, effective_status, effective_expires_at, is_premium, source)` where `source` ∈ `admin_override | subscription | trial | free`.

#### 2) Start a client-side trial (used by Expo Go simulation)
```sql
select public.start_premium_trial(7);  -- 7-day trial for current user
```
Sets `subscription_tier='premium'`, `subscription_status='trialing'`, and `trial_ends_at`.

#### 3) Upsert a subscription event and update cache
```sql
select public.upsert_subscription_event(
  p_status => 'active',
  p_tier => 'premium',
  p_product_id => 'com.momentumaicalendar.premium.monthly',
  p_expires_at => now() + interval '30 days',
  p_subscription_id => null,
  p_platform => 'ios',
  p_environment => 'production'
);
```
Inserts into `public.subscriptions` and updates `user_profiles` fields.

### Client Integration

#### `providers/SubscriptionProvider.tsx`
- Computes `isPremium` from DB fields and respects admin override.
- Calls `subscriptionService.syncSubscriptionStatus()` and refreshes the user profile.

#### `services/subscriptionService.ts`
- Expo Go simulation: calls `rpc('start_premium_trial', { p_days: 7 })` so premium persists across reloads.
- Production: verifies iOS receipts via edge function `verify_ios_receipt`, then updates `user_profiles` and logs to `subscriptions`.
- Optional: production flow can also call `upsert_subscription_event` for consistency.

#### `providers/UserProvider.tsx`
- Loads `user_profiles` and determines `isPremium` with trial/expiry awareness:
  - Active paid plan: `subscription_status='active'` and (no `subscription_expires_at` or in the future).
  - Trial: `subscription_status='trialing'` and `trial_ends_at` in the future.

### Admin Override

Grant or remove admin premium with SQL (run in SQL editor as admin):

```sql
-- Grant lifetime premium
update public.user_profiles
set admin_premium_tier='premium', admin_premium_until='infinity'
where id = 'USER_UUID';

-- Grant time-limited premium (e.g., 30 days)
update public.user_profiles
set admin_premium_tier='premium', admin_premium_until=now() + interval '30 days'
where id = 'USER_UUID';

-- Clear override
update public.user_profiles
set admin_premium_tier = null, admin_premium_until = null
where id = 'USER_UUID';
```

Admin override always takes precedence in the resolver and client.

### Free Trial

- Expo Go / testing: use `start_premium_trial(p_days)`; the app calls this via Supabase RPC.
- Production: prefer App Store product-level trials; the verified receipt drives DB updates.

### Testing Checklist

1) Expo Go simulation
   - Open upgrade modal → simulate purchase.
   - Confirm `user_profiles` has `subscription_tier='premium'`, `subscription_status='trialing'`, `trial_ends_at` future.
   - Reload the app → remains premium while trial is active.

2) Effective resolver
```sql
select * from public.get_effective_subscription();
```
Verify `is_premium=true` and the correct `source`.

3) Admin override
   - Set `admin_premium_tier='premium'`, `admin_premium_until='infinity'` → premium regardless of other fields.

4) Production purchase
   - After a real purchase, ensure `verify_ios_receipt` runs and DB fields update.
   - Verify a row is inserted into `public.subscriptions`.

### Notes

- DB is the single source of truth; client caches refresh from `user_profiles`.
- RPCs are `SECURITY DEFINER` and honor existing RLS by writing as the function owner but scoping updates to `auth.uid()`.
- Feature gates rely on `isPremium`; changes above are fully compatible with goal limits, AI features, color picker, and analytics.

---

## Feature Strategy

### Feature Tiers Overview

#### 🆓 FREE TIER
- 3 Active Goals Maximum
- Basic Goal Creation
- Goal Progress Tracking
- Basic Task Management
- Basic Calendar View
- Local Notifications
- Dark/Light Theme
- Basic Dashboard
- 5 Predefined Goal Colors

#### 💎 PREMIUM TIER
- Unlimited Goals
- AI Goal Creation
- AI Chat Coach
- Advanced Analytics
- Smart Scheduling
- Custom Goal Colors
- Priority Support
- Early Access Features

### Feature Comparison Matrix

| Feature Category | Free Tier | Premium Tier |
|------------------|-----------|--------------|
| **Goal Management** | 3 active goals, basic creation | Unlimited goals, AI creation |
| **AI Features** | None | Full AI assistant & coaching |
| **Analytics** | Basic progress bars | Advanced insights & reports |
| **Calendar** | Month view only | Month view + smart scheduling |
| **Notifications** | Local, basic timing | Smart notifications + push |
| **Goal Colors** | 5 predefined colors | Custom color picker |
| **Themes** | Dark/Light only | Dark/Light + custom goal colors |
| **Support** | Community support | Priority support |

### Pricing Strategy

- **Free**: $0/month - 3 Goals, Basic Features
- **Premium**: $9.99/month - Unlimited, AI Features
- **Family**: $14.99/month - 5 Users, Collaboration

### User Journey Flow

1. User Downloads App → Free Tier Experience
2. User Engaged? → Hit Goal Limit or Want AI
3. Upgrade Prompt → Upgrade Decision
4. Premium Features → AI Goal Creation → Advanced Analytics → Long-term Retention

### Goal Color Customization Strategy

#### Free Tier Colors
- **5 Predefined Colors**: Blue, Green, Red, Orange, Purple
- **Fixed Color Palette**: Users can choose from preset options
- **Basic Visual Organization**: Simple color coding for goals

#### Premium Tier Colors
- **Custom Color Picker**: Full spectrum color selection
- **Hex Code Input**: Advanced users can input exact colors
- **Color History**: Save frequently used custom colors
- **Brand Colors**: Support for company/brand color schemes

### Success Metrics

#### Free Tier Metrics
- Goal Creation Rate: Track how quickly users create their first 3 goals
- Feature Usage: Monitor which free features are most used
- Time to Goal Limit: Measure how long until users hit the 3-goal limit
- Color Usage: Track which predefined colors are most popular
- Retention Rate: Track 7-day, 30-day retention for free users

#### Premium Tier Metrics
- Conversion Rate: Free to premium conversion percentage
- AI Feature Adoption: Usage of AI goal creation and chat
- Advanced Feature Usage: Analytics, smart scheduling adoption
- Custom Color Usage: How many users customize goal colors
- Subscription Retention: Monthly churn rate for premium users

#### Revenue Metrics
- Monthly Recurring Revenue (MRR): Track subscription revenue
- Average Revenue Per User (ARPU): Revenue per user calculation
- Customer Lifetime Value (CLV): Long-term revenue per user
- Churn Rate: Monthly subscription cancellation rate

### Marketing Positioning

#### Free Tier Value Proposition
- "Start your goal-tracking journey"
- "Perfect for personal productivity"
- "Core features included forever"
- "5 beautiful goal colors included"

#### Premium Tier Value Proposition
- "Unlock AI-powered goal creation"
- "Unlimited goals & advanced insights"
- "Customize your goals with any color"
- "Smart scheduling & analytics"
- "Professional-grade productivity tools"

---

## Implementation Summary

### What Was Implemented

#### 1. Database Schema Updates
- Added subscription fields to `user_profiles` table:
  - `subscription_tier` (free/premium/family)
  - `subscription_status` (active/expired/cancelled/trialing)
  - `subscription_expires_at`
  - `subscription_id`
  - `product_id`
- Created `subscriptions` table for tracking subscription history
- Added helper functions for checking premium status

#### 2. Subscription Management System
- **RevenueCat Integration** (`services/subscriptionService.ts`):
  - Purchase handling
  - Receipt validation
  - Subscription status syncing
  - Restore purchases functionality
  - iOS-specific subscription management

#### 3. Feature Gating System
- **Feature Gate Service** (`services/featureGate.ts`):
  - Central control for all premium features
  - Goal limit enforcement (3 for free users)
  - Feature access checks
  - Upgrade messaging

#### 4. User Model Updates
- Enhanced User model with subscription information
- Real-time premium status checking
- Subscription tier tracking

#### 5. Premium Features Implemented

**Free Tier Limitations:**
- ✅ **3 Active Goals Maximum**
  - Enforced in `GoalsProvider`
  - Shows upgrade prompt when limit reached
  
- ✅ **Single Default Color (Blue)**
  - All goals use #3B82F6
  - Color picker disabled with upgrade prompt
  
- ✅ **No AI Goal Creation**
  - AI option shows premium badge
  - Redirects to upgrade modal

**Premium Tier Features:**
- ✅ **Unlimited Goals**
- ✅ **AI Goal Creation**
  - Full conversational AI assistant
  - Smart task scheduling
  
- ✅ **Custom Goal Colors**
  - Full color picker for each goal
  - Individual goal customization
  
- ✅ **All Basic Features**

#### 6. UI Components Created

**Premium Upgrade Modal** (`app/components/PremiumUpgradeModal.tsx`)
- Beautiful upgrade screen with pricing
- Dynamic content based on trigger context
- RevenueCat purchase integration
- Restore purchases option

**Subscription Provider** (`providers/SubscriptionProvider.tsx`)
- Global subscription state management
- Easy upgrade modal access from anywhere
- Automatic status syncing

#### 7. Premium Gates Added To:
- ✅ **Goal Creation**
  - Manual goal creation (3-goal limit)
  - AI goal creation (premium only)
  
- ✅ **Color Customization**
  - Manual goal creation modal
  - Goal edit modal
  
- ✅ **Settings Screen**
  - Shows subscription status
  - Upgrade/manage subscription options

### Technical Implementation Details

#### Feature Access Pattern
```typescript
// Check premium access
const canAccess = await featureGate.canAccessFeature(Feature.AI_GOAL_CREATION);
if (!canAccess.hasAccess) {
  showUpgradeModal('ai_goal');
  return;
}
```

#### Goal Limit Enforcement
```typescript
// In GoalsProvider
const goalLimitCheck = await featureGate.checkGoalLimit(user.id);
if (!goalLimitCheck.canCreateGoal) {
  // Show upgrade modal
}
```

#### Color Restriction
```typescript
// Only use custom color if premium
const goalColor = isPremium ? color : featureGate.getDefaultGoalColor();
```

### iOS App Store Setup Required

1. **Create In-App Purchase Products**:
   - Product ID: `com.momentum.premium.monthly` ($9.99/month)
   - Product ID: `com.momentum.family.monthly` ($14.99/month) [optional]

2. **Configure RevenueCat**:
   - Add iOS API key to .env
   - Set up products and entitlements

3. **Test with Sandbox**:
   - Create sandbox test accounts
   - Test full purchase flow

See `docs/setup/COMPLETE_SETUP_GUIDE.md` for detailed setup instructions.

### User Experience Flow

#### Free User Journey:
1. Downloads app → 3 goals available
2. Creates goals → Sees progress
3. Hits limit or wants AI/colors → Upgrade prompt
4. Purchases premium → All features unlocked

#### Premium User Experience:
- Unlimited goal creation
- AI assistant for smart goal planning
- Beautiful color customization
- Priority support badge
- "Premium Member" status in settings

### Security Considerations

- Receipt validation through RevenueCat
- Server-side subscription status sync
- Secure API key management
- No client-side price manipulation

### Analytics Tracking Points

- Goal creation attempts (free vs premium)
- Upgrade modal triggers
- Conversion funnel metrics
- Feature usage by tier

### Next Steps

1. **Configure App Store Products**
2. **Set Up RevenueCat Account**
3. **Add Environment Variables**
4. **Test Purchase Flow**
5. **Submit for App Review**

The premium system is fully implemented and ready for App Store configuration!

---

## Database Schema

See the main setup guide for complete database schema details. Key tables:

- `user_profiles` - User subscription information
- `subscriptions` - Subscription event log
- RPC functions for subscription management

---

## User Experience

### Subscription Management Modal

The Subscription Management Modal has been completely redesigned with a more modern, polished interface that better showcases premium features and subscription details.

#### Visual Improvements

1. **Updated Header**
   - Shortened title from "Subscription Management" to "My Subscription"
   - Cleaner, more concise header
   - Crown icon maintained for premium branding

2. **Enhanced Status Card**
   - **Premium Badge**: Top-right corner badge showing "PREMIUM" status with crown icon
   - **Border Highlight**: Premium subscriptions get a primary-colored border (2px vs 1px)
   - **Plan Info Section**: 
     - Main title: "Momentum Premium/Free"
     - Subtitle: "All premium features unlocked" or "Limited features"
   - **Prominent Pricing Display**:
     - Large, centered price display
     - Clean background card
     - "$4.99/month" format with emphasized price
   - **Status Badge**: Active/Trialing/Cancelled indicator with color coding

3. **Redesigned Feature Cards**
   Each feature now includes:
   - **Custom Icons**: Target, Sparkles, Zap, Crown, Check icons
   - **Icon Containers**: Colored backgrounds matching the theme
   - **Two-Line Display**:
     - Bold feature title
     - Descriptive subtitle explaining the benefit
   - **Individual Cards**: Each feature in its own card with border and padding
   - **Section Header**: "Premium Features" with crown icon

### Premium Features Listed

- 🎯 **Unlimited Goals** - Create as many goals as you need
- ✨ **AI Goal Creation** - Let AI build personalized plans
- ⚡ **Unlimited AI Chats** - No weekly chat limits
- 👑 **Custom Goal Colors** - Personalize your goals
- ✓ **Priority Support** - Get help faster

---

**Status**: ✅ Fully Implemented
**Version**: 1.0
**Last Updated**: Current build

