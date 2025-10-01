-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tz text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now()
);

-- Create enums
create type public.goal_status as enum ('active','paused','completed','archived');
create type public.task_status as enum ('pending','done','skipped');

-- Create goals table
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date timestamptz,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz not null,
  duration_minutes int,
  all_day boolean not null default false,
  status task_status not null default 'pending',
  completed_at timestamptz,
  seq int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create goal_progress view
create or replace view public.goal_progress as
select
  g.id as goal_id,
  g.user_id,
  g.title,
  g.description,
  g.target_date,
  g.status,
  g.created_at,
  g.updated_at,
  count(t.*) filter (where t.status='done')::float / nullif(count(t.*),0) as completion_ratio
from goals g
left join tasks t on t.goal_id = g.id
group by g.id, g.user_id, g.title, g.description, g.target_date, g.status, g.created_at, g.updated_at;

-- Enable RLS
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.profiles enable row level security;

-- Create RLS policies
create policy "own goals" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on public.tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile" on public.profiles for all using (id = auth.uid());

-- Create RPC function
create or replace function public.create_goal_with_tasks(p_user_id uuid, p_goal jsonb, p_tasks jsonb)
returns uuid
language plpgsql
security definer
as $$
declare
  v_goal_id uuid;
  v_idx int := 0;
  v_task jsonb;
begin
  insert into public.goals (user_id, title, description, target_date, status)
  values (
    p_user_id,
    p_goal->>'title',
    p_goal->>'description',
    (p_goal->>'target_date')::timestamptz,
    coalesce((p_goal->>'status')::public.goal_status, 'active')
  )
  returning id into v_goal_id;

  for v_idx in 0 .. jsonb_array_length(p_tasks)-1 loop
    v_task := p_tasks->v_idx;
    insert into public.tasks (
      goal_id, user_id, title, notes, due_at, duration_minutes, all_day, status, seq
    ) values (
      v_goal_id,
      p_user_id,
      v_task->>'title',
      v_task->>'notes',
      (v_task->>'due_at')::timestamptz,
      nullif((v_task->>'duration_minutes')::int,0),
      coalesce((v_task->>'all_day')::boolean,false),
      coalesce((v_task->>'status')::public.task_status,'pending'),
      nullif((v_task->>'seq')::int,0)
    );
  end loop;

  return v_goal_id;
end $$;
