// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type SaKey = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function env(name: string, def = ""): string {
  const v = Deno.env.get(name);
  if (!v && !def) throw new Error(`Missing env ${name}`);
  return v ?? def;
}

const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_ANON_KEY = env("SUPABASE_ANON_KEY");
const GCP_SA_KEY = env("GCP_SA_KEY");
const GCP_PROJECT_ID = env("GCP_PROJECT_ID");
const GCP_LOCATION = env("GCP_LOCATION", "us-central1");
const MODEL_NAME = env("GEMINI_MODEL", "gemini-2.5-pro");

function b64url(input: string | ArrayBuffer): string {
  let bin = typeof input === "string" ? input : String.fromCharCode(...new Uint8Array(input as ArrayBuffer));
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function importPkcs8(privateKeyPem: string) {
  const pem = privateKeyPem.trim().replaceAll("-----BEGIN PRIVATE KEY-----", "").replaceAll("-----END PRIVATE KEY-----", "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getAccessToken(sa: SaKey): Promise<string> {
  const key = await importPkcs8(sa.private_key);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;
  const params = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
  const json = await resp.json();
  return json.access_token as string;
}

async function callGemini(accessToken: string, prompt: string, schema: any) {
  const url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${MODEL_NAME}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      candidateCount: 1,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Gemini error: ${resp.status}`);
  const json: any = await resp.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? json.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data;
  if (!text) throw new Error("No content returned");
  return JSON.parse(text);
}

function plannerSchema() {
  return {
    type: "object",
    properties: {
      goal: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          targetDate: { type: "string" },
          successCriteria: { type: "array", items: { type: "string" } },
        },
        required: ["title", "targetDate"],
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            notes: { type: "string" },
            estimatedMinutes: { type: "integer" },
            dueDate: { type: "string" },
            earliestStartDate: { type: "string" },
            dependencies: { type: "array", items: { type: "string" } },
            preferredWindows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  daysOfWeek: { type: "array", items: { type: "string" } },
                  startLocal: { type: "string" },
                  endLocal: { type: "string" },
                },
                required: ["daysOfWeek", "startLocal", "endLocal"],
              },
            },
            avoidWindows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  daysOfWeek: { type: "array", items: { type: "string" } },
                  startLocal: { type: "string" },
                  endLocal: { type: "string" },
                },
              },
            },
            sessionMinMinutes: { type: "integer" },
            sessionMaxMinutes: { type: "integer" },
            allowSplitting: { type: "boolean" },
            priority: { type: "string" },
          },
          required: ["id", "title", "estimatedMinutes"],
        },
      },
    },
    required: ["goal", "tasks"],
  };
}

function buildPrompt(input: any) {
  const { intent, constraints, chatSummary, profile } = input;
  return `You are an expert planner. Create a tailored plan.
User profile (JSON): ${JSON.stringify(profile)}
Constraints (JSON): ${JSON.stringify(constraints)}
Chat summary: ${chatSummary ?? ""}
Intent: ${intent}
Return only JSON that matches the provided schema.`;
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

async function getContext(userId: string) {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // profiles.tz
  const { data: tzRow } = await sb.from("profiles").select("tz").eq("id", userId).maybeSingle();
  // user_profiles basics
  const { data: up } = await sb
    .from("user_profiles")
    .select("full_name,username,gender,unit_system,date_of_birth")
    .eq("id", userId)
    .maybeSingle();
  // planning preferences
  const { data: prefs } = await sb
    .from("user_planning_profile")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  return { tz: tzRow?.tz ?? "UTC", profile: up ?? {}, preferences: prefs?.preferences ?? {} };
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const user = await getUser(req);
    if (!user) return new Response("Unauthorized", { status: 401 });
    const body = await req.json();
    const ctx = await getContext(user.id);
    const prompt = buildPrompt({ intent: body.intent, constraints: body.constraints ?? {}, chatSummary: body.chatSummary ?? "", profile: { ...ctx.profile, tz: ctx.tz, preferences: ctx.preferences } });
    const sa: SaKey = JSON.parse(GCP_SA_KEY);
    const token = await getAccessToken(sa);
    const schema = plannerSchema();
    const plan = await callGemini(token, prompt, schema);
    return new Response(JSON.stringify({ plan }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


