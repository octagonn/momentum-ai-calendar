-- Fix: cast unit_system from text JSON metadata to enum during signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_full_name text;
  v_username text;
  v_dob date;
  v_age int;
  v_gender text;
  v_height_cm int;
  v_weight_kg int;
  v_unit_system_text text;
  v_unit_system_enum unit_system;
begin
  v_full_name := nullif(new.raw_user_meta_data->>'full_name','');
  v_username := lower(nullif(new.raw_user_meta_data->>'username',''));
  v_gender := nullif(new.raw_user_meta_data->>'gender','');
  v_unit_system_text := coalesce(nullif(new.raw_user_meta_data->>'unit_system',''),'metric');

  -- Parse optional fields defensively
  begin
    v_dob := to_date(nullif(new.raw_user_meta_data->>'date_of_birth',''), 'YYYY-MM-DD');
  exception when others then
    v_dob := null;
  end;

  begin
    v_age := nullif((new.raw_user_meta_data->>'age')::int, 0);
  exception when others then
    v_age := null;
  end;

  begin
    v_height_cm := nullif((new.raw_user_meta_data->>'height_cm')::int, 0);
  exception when others then
    v_height_cm := null;
  end;

  begin
    v_weight_kg := nullif((new.raw_user_meta_data->>'weight_kg')::int, 0);
  exception when others then
    v_weight_kg := null;
  end;

  -- Map text to enum safely; default to 'metric' if invalid
  if v_unit_system_text in ('imperial','metric') then
    v_unit_system_enum := v_unit_system_text::unit_system;
  else
    v_unit_system_enum := 'metric'::unit_system;
  end if;

  insert into public.user_profiles (
    id, email, full_name, username, onboarding_completed,
    date_of_birth, age, gender, height_cm, weight_kg, unit_system,
    created_at, updated_at
  ) values (
    new.id, new.email, coalesce(v_full_name, new.email), null, true,
    v_dob, v_age, v_gender, v_height_cm, v_weight_kg, v_unit_system_enum,
    now(), now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, user_profiles.full_name),
    onboarding_completed = true,
    date_of_birth = coalesce(excluded.date_of_birth, user_profiles.date_of_birth),
    age = coalesce(excluded.age, user_profiles.age),
    gender = coalesce(excluded.gender, user_profiles.gender),
    height_cm = coalesce(excluded.height_cm, user_profiles.height_cm),
    weight_kg = coalesce(excluded.weight_kg, user_profiles.weight_kg),
    unit_system = coalesce(excluded.unit_system, user_profiles.unit_system),
    updated_at = now();

  if v_username is not null and not exists (
    select 1 from public.user_profiles up where up.username = v_username and up.id <> new.id
  ) then
    update public.user_profiles
      set username = v_username,
          updated_at = now()
      where id = new.id;
  end if;

  return new;
end
$$;


