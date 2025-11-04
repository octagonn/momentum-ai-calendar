-- Ensure goal_progress view runs with caller privileges (RLS of querying user)
ALTER VIEW public.goal_progress SET (security_invoker = on);

-- Harden SECURITY DEFINER functions by pinning a safe search_path
DO $$ BEGIN
  BEGIN ALTER FUNCTION public.get_week_start() SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_week_start'; END;
  BEGIN ALTER FUNCTION public.get_weekly_chat_count(uuid) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_weekly_chat_count'; END;
  BEGIN ALTER FUNCTION public.can_create_chat(uuid) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip can_create_chat'; END;
  BEGIN ALTER FUNCTION public.cleanup_old_chat_usage() SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip cleanup_old_chat_usage'; END;
  BEGIN ALTER FUNCTION public.refresh_chat_stats() SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip refresh_chat_stats'; END;
  BEGIN ALTER FUNCTION public.is_user_premium(uuid) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip is_user_premium'; END;
  BEGIN ALTER FUNCTION public.count_user_active_goals(uuid) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip count_user_active_goals'; END;
  BEGIN ALTER FUNCTION public.is_admin_premium_active(uuid) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip is_admin_premium_active'; END;
  BEGIN ALTER FUNCTION public.grant_admin_premium(uuid, text, subscription_tier, text, text) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip grant_admin_premium'; END;
  BEGIN ALTER FUNCTION public.clear_admin_premium(uuid) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip clear_admin_premium'; END;
  BEGIN ALTER FUNCTION public.create_goal_with_tasks(uuid, jsonb, jsonb) SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip create_goal_with_tasks'; END;
  BEGIN ALTER FUNCTION public.get_current_user_profile() SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_current_user_profile'; END;
  BEGIN ALTER FUNCTION public.get_user_goals_with_profile() SET search_path = public, extensions; EXCEPTION WHEN undefined_function THEN RAISE NOTICE 'skip get_user_goals_with_profile'; END;
END $$;



