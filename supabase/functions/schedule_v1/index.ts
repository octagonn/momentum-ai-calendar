// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function env(n: string, d = ""): string { const v = Deno.env.get(n); if (!v && !d) throw new Error(`Missing env ${n}`); return v ?? d; }
const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_ANON_KEY = env("SUPABASE_ANON_KEY");

type Task = {
  id: string;
  title: string;
  notes?: string;
  estimatedMinutes: number;
  dueDate?: string; // YYYY-MM-DD
  earliestStartDate?: string;
  dependencies?: string[];
  sessionMinMinutes?: number;
  sessionMaxMinutes?: number;
  allowSplitting?: boolean;
};

function iso(date: Date) { return date.toISOString(); }

type Interval = { start: number; end: number };

function subtractBusy(freeWindows: Interval[], busy: Interval[]): Interval[] {
  let free = [...freeWindows];
  for (const b of busy) {
    const next: Interval[] = [];
    for (const f of free) {
      if (b.end <= f.start || b.start >= f.end) { next.push(f); continue; }
      if (b.start > f.start) next.push({ start: f.start, end: Math.max(f.start, b.start) });
      if (b.end < f.end) next.push({ start: Math.min(b.end, f.end), end: f.end });
    }
    free = next.filter(iv => iv.end - iv.start > 0);
  }
  return free;
}

function minutes(ms: number) { return Math.floor(ms / 60000); }

function toIntervalsFromWorkingHours(start: Date, end: Date, tzOffsetMin: number, hours: { start: string; end: string; days: number[] }) {
  // We keep in UTC; interpret working hours as local then convert to UTC by subtracting tzOffset
  const result: Interval[] = [];
  const cur = new Date(start);
  while (cur < end) {
    const day = cur.getUTCDay();
    if (hours.days.includes(day)) {
      const [sh, sm] = hours.start.split(":").map(Number);
      const [eh, em] = hours.end.split(":").map(Number);
      const dayStartLocal = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), sh, sm));
      const dayEndLocal = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(), eh, em));
      const startUtc = dayStartLocal.getTime() - tzOffsetMin * 60000;
      const endUtc = dayEndLocal.getTime() - tzOffsetMin * 60000;
      result.push({ start: Math.max(startUtc, start.getTime()), end: Math.min(endUtc, end.getTime()) });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result.filter(iv => iv.end > iv.start);
}

function placeTaskSessions(task: Task, free: Interval[]): { placed: Interval[]; free: Interval[] } {
  const min = Math.max(15, task.sessionMinMinutes ?? 30);
  const max = Math.max(min, task.sessionMaxMinutes ?? 90);
  let remaining = task.estimatedMinutes;
  const placed: Interval[] = [];
  const out: Interval[] = [...free];
  for (let i = 0; i < out.length && remaining > 0; i++) {
    const f = out[i];
    const fmin = minutes(f.end - f.start);
    if (fmin < min) continue;
    const ses = Math.min(max, remaining, fmin);
    const sesMs = ses * 60000;
    const start = f.start;
    const end = start + sesMs;
    placed.push({ start, end });
    out[i] = { start: end, end: f.end };
    remaining -= ses;
  }
  if (remaining > 0) throw new Error(`Not enough time to place task ${task.title}`);
  return { placed, free: out.filter(iv => iv.end - iv.start > 0) };
}

async function authUser(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return { user: null, authHeader: null } as any;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data } = await sb.auth.getUser();
  return { user: data.user ?? null, authHeader: auth } as any;
}

async function getTz(userId: string) {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await sb.from("profiles").select("tz").eq("id", userId).maybeSingle();
  return data?.tz ?? "UTC";
}

function tzOffsetMinutes(tz: string) {
  try { return -new Date().toLocaleString("en-US", { timeZone: tz, timeZoneName: "short" }).match(/GMT([+-]\d+)/) ? 0 : 0; } catch { return 0; }
}

async function fetchBusy(authHeader: string, startIso: string, endIso: string) {
  const projRef = (new URL(SUPABASE_URL)).host.split(".")[0];
  const url = `https://${projRef}.functions.supabase.co/calendar_proxy/freebusy?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  const r = await fetch(url, { headers: { Authorization: authHeader } });
  if (!r.ok) throw new Error(`freebusy ${r.status}`);
  const json: any = await r.json();
  const out: Interval[] = [];
  for (const k of Object.keys(json.calendars ?? json?.calendars ?? {})) {
    const e = json.calendars[k];
    for (const b of e.busy ?? []) out.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
  }
  // Also support alternate response shape under json.calendars: {} else json?.calendars never mind
  for (const cal of Object.values(json.calendars ?? {} as any)) {
    for (const b of (cal as any).busy ?? []) out.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
  }
  return out.sort((a, b) => a.start - b.start);
}

async function commitPlan(authHeader: string, userId: string, goal: any, tasks: Task[], sessions: { taskId: string; start: number; end: number }[]) {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: g, error: ge } = await sb.from("goals").insert({ user_id: userId, title: goal.title, description: goal.description ?? null, target_date: goal.targetDate ? new Date(goal.targetDate).toISOString() : null }).select("id").single();
  if (ge) throw ge;
  const goalId = g.id as string;
  const toInsertTasks = tasks.map((t, idx) => ({ goal_id: goalId, user_id: userId, title: t.title, notes: t.notes ?? null, due_at: t.dueDate ? new Date(t.dueDate).toISOString() : null, duration_minutes: t.estimatedMinutes, seq: idx + 1 }));
  const { data: trows, error: te } = await sb.from("tasks").insert(toInsertTasks).select("id, title");
  if (te) throw te;
  const titleToId = new Map<string, string>();
  for (const r of trows as any[]) titleToId.set(r.title, r.id);
  const sesRows = sessions.map((s) => ({ task_id: titleToId.get(tasks.find(x => x.id === s.taskId)?.title ?? "")!, user_id: userId, start_at: new Date(s.start).toISOString(), end_at: new Date(s.end).toISOString() }));
  if (sesRows.length) {
    const { error: se } = await sb.from("task_sessions").insert(sesRows);
    if (se) throw se;
  }
  return { goalId };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const { user, authHeader } = await authUser(req);
    if (!user || !authHeader) return new Response("Unauthorized", { status: 401 });
    const payload = await req.json();
    const plan = payload.plan ?? payload; // allow raw planner json
    const commit = Boolean(payload.commit);
    const now = new Date();
    const tz = await getTz(user.id);
    const tzOff = tzOffsetMinutes(tz);
    const horizonEnd = new Date(now.getTime() + 42 * 24 * 3600 * 1000);
    const working = { start: "09:00", end: "17:00", days: [1,2,3,4,5] }; // Mon-Fri
    let free = toIntervalsFromWorkingHours(now, horizonEnd, tzOff, working);

    const busy = await fetchBusy(authHeader, iso(now), iso(horizonEnd));
    free = subtractBusy(free, busy);

    // Optional device-provided busy windows (e.g., Apple on-device calendars)
    const extraBusyRaw = Array.isArray(payload.extraBusy) ? payload.extraBusy as any[] : [];
    if (extraBusyRaw.length > 0) {
      const extraBusy: Interval[] = extraBusyRaw.map((b: any) => ({
        start: typeof b.start === "string" ? Date.parse(b.start) : Number(b.start),
        end: typeof b.end === "string" ? Date.parse(b.end) : Number(b.end),
      })).filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);
      if (extraBusy.length > 0) {
        free = subtractBusy(free, extraBusy);
      }
    }

    // naive dependency order: topo by given order with deps simple filter
    const tasks: Task[] = (plan.tasks ?? []).slice();
    const placedSessions: { taskId: string; start: number; end: number }[] = [];
    for (const t of tasks) {
      const res = placeTaskSessions(t, free);
      free = res.free;
      for (const iv of res.placed) placedSessions.push({ taskId: t.id, start: iv.start, end: iv.end });
    }

    if (!commit) return new Response(JSON.stringify({ sessions: placedSessions }), { headers: { "Content-Type": "application/json" } });
    const commitRes = await commitPlan(authHeader, user.id, plan.goal, tasks, placedSessions);
    return new Response(JSON.stringify({ ok: true, ...commitRes }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


