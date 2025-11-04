-- Effective subscription resolver and RPCs for persisting purchases and trials

-- Function: get_effective_subscription
create or replace function public.get_effective_subscription(p_user_id uuid default auth.uid())
returns table (
  effective_tier subscription_tier,
  effective_status subscription_status,
  effective_expires_at timestamptz,
  is_premium boolean,
  source text
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sub_tier subscription_tier;
  v_sub_status subscription_status;
  v_sub_expires timestamptz;
  v_admin_tier subscription_tier;
  v_admin_until timestamptz;
  v_trial_ends timestamptz;
  v_admin_active boolean;
  v_sub_active boolean;
  v_trial_active boolean;
  v_uid uuid := coalesce(p_user_id, auth.uid());
begin
  select 
    up.subscription_tier,
    up.subscription_status,
    up.subscription_expires_at,
    up.admin_premium_tier,
    up.admin_premium_until,
    up.trial_ends_at
  into 
    v_sub_tier, v_sub_status, v_sub_expires, v_admin_tier, v_admin_until, v_trial_ends
  from public.user_profiles up
  where up.id = v_uid;

  v_admin_active := (v_admin_tier in ('premium','family')) and (
    v_admin_until = 'infinity'::timestamptz or v_admin_until > now()
  );

  v_sub_active := (v_sub_tier in ('premium','family')) and (v_sub_status in ('active','trialing')) and 
                   (v_sub_expires is null or v_sub_expires > now());

  v_trial_active := v_trial_ends is not null and v_trial_ends > now();

  if v_admin_active then
    effective_tier := v_admin_tier;
    effective_status := 'active';
    effective_expires_at := v_admin_until;
    is_premium := true;
    source := 'admin_override';
    return next;
    return;
  elsif v_sub_active then
    effective_tier := coalesce(v_sub_tier, 'premium');
    effective_status := v_sub_status;
    effective_expires_at := v_sub_expires;
    is_premium := true;
    source := 'subscription';
    return next;
    return;
  elsif v_trial_active then
    effective_tier := 'premium';
    effective_status := 'trialing';
    effective_expires_at := v_trial_ends;
    is_premium := true;
    source := 'trial';
    return next;
    return;
  else
    effective_tier := 'free';
    effective_status := 'expired';
    effective_expires_at := null;
    is_premium := false;
    source := 'free';
    return next;
    return;
  end if;
end
$$;

-- Function: start_premium_trial (client-safe RPC)
create or replace function public.start_premium_trial(p_days integer default 7)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz := now() + (make_interval(days => greatest(p_days,1)));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.user_profiles
  set 
    subscription_tier = 'premium',
    subscription_status = 'trialing',
    trial_ends_at = v_until,
    updated_at = now()
  where id = v_uid;
end
$$;

-- Function: upsert_subscription_event (client-safe RPC for persisting purchases)
create or replace function public.upsert_subscription_event(
  p_status subscription_status,
  p_tier subscription_tier,
  p_product_id text,
  p_expires_at timestamptz,
  p_subscription_id text default null,
  p_platform text default 'ios',
  p_environment text default 'sandbox'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.subscriptions (
    user_id, subscription_id, product_id, purchase_date, expires_date, status, tier, platform, environment
  ) values (
    v_uid, p_subscription_id, p_product_id, now(), p_expires_at, p_status, p_tier, p_platform, p_environment
  );

  update public.user_profiles
  set 
    subscription_tier = p_tier,
    subscription_status = p_status,
    subscription_expires_at = p_expires_at,
    product_id = p_product_id,
    subscription_id = coalesce(p_subscription_id, subscription_id),
    updated_at = now()
  where id = v_uid;
end
$$;


