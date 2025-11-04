## Premium Subscription System (Current Implementation)

### High-level
- **Source of truth**: `public.user_profiles` subscription fields.
- **Effective premium** is resolved by precedence: **admin override** → **active subscription** → **trial** → **free**.
- **Persistence**: Expo Go simulations now persist to Supabase; production purchases update Supabase after receipt verification.

### Database model
- `public.user_profiles` (selected fields):
  - `subscription_tier` enum: `free | premium | family`
  - `subscription_status` enum: `active | expired | cancelled | trialing`
  - `subscription_expires_at` timestamptz (nullable; null treated as non-expiring active in some cases)
  - `trial_ends_at` timestamptz
  - `product_id`, `subscription_id` (optional identifiers)
  - Admin override: `admin_premium_tier` (`premium|family`), `admin_premium_until` (timestamp or `'infinity'`)

- `public.subscriptions` (event log):
  - Tracks purchase events: `user_id`, `subscription_id`, `product_id`, `purchase_date`, `expires_date`, `status`, `tier`, `platform`, `environment`.

- RLS summary:
  - `user_profiles`: users can `SELECT/UPDATE/INSERT` for their own `id = auth.uid()`.
  - `subscriptions`: users can `SELECT` their own events; inserts/updates require `auth.uid() = user_id` (done via RPCs or client with row checks).

### Server-side RPCs (Supabase)
These are created as `SECURITY DEFINER` functions and callable from the client.

1) Effective resolver
```sql
select * from public.get_effective_subscription();             -- for current user
select * from public.get_effective_subscription('UUID-HERE');  -- for a specific user
```
Returns: `(effective_tier, effective_status, effective_expires_at, is_premium, source)` where `source` ∈ `admin_override | subscription | trial | free`.

2) Start a client-side trial (used by Expo Go simulation)
```sql
select public.start_premium_trial(7);  -- 7-day trial for current user
```
Sets `subscription_tier='premium'`, `subscription_status='trialing'`, and `trial_ends_at`.

3) Upsert a subscription event and update cache
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

### Client integration
- `providers/SubscriptionProvider.tsx`
  - Computes `isPremium` from DB fields and respects admin override.
  - Calls `subscriptionService.syncSubscriptionStatus()` and refreshes the user profile.

- `services/subscriptionService.ts`
  - Expo Go simulation: calls `rpc('start_premium_trial', { p_days: 7 })` so premium persists across reloads.
  - Production: verifies iOS receipts via edge function `verify_ios_receipt`, then updates `user_profiles` and logs to `subscriptions`.
  - Optional: production flow can also call `upsert_subscription_event` for consistency.

- `providers/UserProvider.tsx`
  - Loads `user_profiles` and determines `isPremium` with trial/expiry awareness:
    - Active paid plan: `subscription_status='active'` and (no `subscription_expires_at` or in the future).
    - Trial: `subscription_status='trialing'` and `trial_ends_at` in the future.

### Admin override
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

### Free trial
- Expo Go / testing: use `start_premium_trial(p_days)`; the app calls this via Supabase RPC.
- Production: prefer App Store product-level trials; the verified receipt drives DB updates.

### Testing checklist
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


