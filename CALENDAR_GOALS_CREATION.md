Here’s a clean, end-to-end plan that keeps things simple, reliable, and “vibe-coder friendly” in Cursor with Expo + Supabase + Gemini. It avoids fragile LLM magic by using a tiny deterministic “interview engine” on the client and one Gemini call for structuring. You’ll get atomic inserts, correct calendar placement, progress tracking, and push notifications.

1) Product flow (MVP)

User opens AI chat on Goals page and types “I want to bench 225.”

A small client-side interview engine asks one question at a time: target date, days/week, minutes/session, preferred days, time of day.

When all required fields are gathered, call a single Edge Function that:

Sends a short chat transcript + fields to Gemini

Receives a structured plan JSON: goal, schedule metadata, and a list of tasks with concrete due_at timestamps

Validates with Zod

Calls a Supabase RPC to insert goal + tasks in one transaction

UI updates:

Goals list shows a card with title + completion bar

Tapping card opens a modal with description + tasks (sorted by next due; completed crossed-out at bottom)

Calendar paints each task on its date/time

Expo notifications are scheduled for each task due_at.

2) Minimal data model (Supabase SQL)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tz text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now()
);

create type public.goal_status as enum ('active','paused','completed','archived');
create type public.task_status as enum ('pending','done','skipped');

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date timestamptz,
  status goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
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

create view public.goal_progress as
select
  g.id as goal_id,
  g.user_id,
  count(t.*) filter (where t.status='done')::float / nullif(count(t.*),0) as completion_ratio
from goals g
left join tasks t on t.goal_id = g.id
group by g.id, g.user_id;

alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.profiles enable row level security;

create policy "own goals" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on public.tasks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile" on public.profiles for all using (id = auth.uid());

3) Single RPC for atomic insert
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

4) The “interview engine” (client, deterministic)

Keep the chat UI, but drive it with a tiny state machine so it’s predictable and fast. Ask only what you need for MVP.

Required fields:

goal_title

target_date (ISO)

days_per_week (1–7)

session_minutes (e.g., 45)

preferred_days (array like ["Mon","Wed","Fri"])

time_of_day ("08:00", "18:30" or null → default)

Zod schema for what Gemini must output later:

import { z } from "zod";

export const TaskZ = z.object({
  title: z.string(),
  notes: z.string().optional(),
  due_at: z.string(), // ISO 8601
  duration_minutes: z.number().int().positive().optional(),
  all_day: z.boolean().optional(),
  status: z.enum(['pending','done','skipped']).optional(),
  seq: z.number().int().optional(),
});

export const GoalZ = z.object({
  title: z.string(),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(['active','paused','completed','archived']).optional(),
});

export const PlanZ = z.object({
  goal: GoalZ,
  tasks: z.array(TaskZ).min(1)
});

export type Plan = z.infer<typeof PlanZ>;


Simple interviewer:

If field missing, ask it.

Validate with local parsing (use date-fns + date-fns-tz).

If user proposes unrealistic target (e.g., fewer than required sessions to reach end date), show a suggestion and ask to adjust. For MVP define “required sessions” as a simple count the user chooses.

5) Task scheduling logic (client)

For MVP, don’t overthink. Create N sessions between now and target_date on preferred_days at time_of_day, spaced to satisfy days_per_week and session_minutes.

Pseudo:

Build a list of calendar dates on preferred_days from tomorrow to target_date

Take the first K dates to match total_sessions (K = days_per_week × number_of_weeks)

Set due_at = date + time_of_day in user tz

Create tasks array with seq increasing

6) One Edge Function: structure + sanity check with Gemini

Input: { transcript, fields, tz }
Output: { plan } where plan matches PlanZ.

Flow:

Compose a short prompt with the user goal, confirmed fields, and the raw scheduled dates you generated.

Ask Gemini to return a clean JSON plan: tighten titles, add concise notes, keep your exact due_at timestamps.

Validate with Zod on the server.

Call create_goal_with_tasks and return the new goal_id.

Deno Edge Function skeleton:

// supabase/functions/ai_plan/index.ts
import { serve } from "http/server";

serve(async (req) => {
  const { transcript, fields, tz } = await req.json();
  const prompt = [
    { role: "system", content: "You are structuring a goal plan JSON. Keep due_at unchanged. Output only valid JSON." },
    { role: "user", content: JSON.stringify({ transcript, fields, tz }) }
  ];

  const geminiModel = Deno.env.get("GEMINI_MODEL")!;
  const geminiKey = Deno.env.get("GEMINI_API_KEY")!;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: JSON.stringify(prompt) }]}],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const plan = JSON.parse(text);

  // Optional: inline Zod validation here in Deno using ESM zod bundle
  // Then insert atomically via RPC
  const { user_id, goal, tasks } = plan;
  const rpc = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/create_goal_with_tasks`, {
    method: "POST",
    headers: {
      apiKey: Deno.env.get("SUPABASE_ANON_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      p_user_id: user_id,
      p_goal: goal,
      p_tasks: tasks
    })
  });

  const goal_id = await rpc.json();
  return new Response(JSON.stringify({ goal_id, plan }), { headers: { "content-type": "application/json" }});
});

7) Client wiring (Expo + Supabase)

Basic service to finish the flow once the interview is complete:

import { createClient } from "@supabase/supabase-js";

export async function completeGoalFromInterview({ transcript, fields, tz, supabase, session }) {
  const r = await fetch(`${process.env.EXPO_PUBLIC_EDGE_URL}/ai_plan`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ transcript, fields, tz })
  });
  const data = await r.json();
  return data.goal_id as string;
}

8) UI components you can drop in fast

Goals grid/list: gluestack Card + a simple computed progress fetch from goal_progress. Show Math.round(completion_ratio*100)%

Goal modal: ScrollView with description; list tasks sorted by status ASC, due_at ASC; Text with textDecorationLine: 'line-through' for done

Calendar: react-native-calendars (month) or react-native-big-calendar (week/day). Map each task to an event. Color by goal_id.

Realtime: subscribe to tasks and goals changes with Supabase Realtime for instant UI updates

9) Marking complete and keeping the bar right
update public.tasks
set status='done', completed_at=now()
where id = :task_id and user_id = auth.uid();

-- progress view already reflects completion

10) Notifications (Expo)

Store device tokens in push_tokens(user_id, token, platform)

When tasks are created, also schedule local push on device

Optional: nightly Edge Function to scan next-day tasks and send remote push via Expo Push API

11) Guardrails for “unrealistic dates”

Client-side heuristic before calling the Edge Function:

If (weeksUntilTarget * days_per_week) < min_sessions_required, show: “This timeline seems tight. Want me to push target to {newDate} or increase days/week?”

12) Developer checklist (in Cursor)

Create SQL schema, policies, RPC

Implement tiny interviewer with a requiredFields array and a nextQuestion() function

Build schedule generator producing ISO due_at in user tz

Create the ai_plan Edge Function and env vars

Wire chat → interviewer → schedule → ai_plan → RPC

Goals screen: query goals + goal_progress; card component; modal detail + task list

Calendar mapping from tasks; color by goal; tap → details, tap-hold → mark done

Add Realtime listeners for tasks/goals

Add Expo push token capture and local scheduling on insert

Write 3 unit tests: plan Zod validation, scheduler spacing, RPC idempotency

13) Example Gemini “structuring” prompt

System:

You create clean JSON plans for goals and tasks

Keep all provided due_at timestamps unchanged

Output only JSON matching this schema: { goal: {...}, tasks: [...] }

User:

transcript: [short chat turns]

fields: { goal_title, target_date, days_per_week, session_minutes, preferred_days, time_of_day }

tz: "America/Los_Angeles"

scheduled_slots: [ { title, due_at, duration_minutes, seq } ]

“Return improved task titles and a 1–2 sentence goal description. Keep the same due_at and seq. No extra keys.”

14) Post-MVP upgrades

Availability table and conflict-free scheduling

Auto-reschedule missed tasks

Dependencies (task B after task A)

External calendar sync (Google/Apple/Microsoft)

Streaks and adaptive pacing

Natural-language edits in the goal modal (“shift all remaining sessions to mornings”)