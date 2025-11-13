// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

function env(name: string, fallback = ""): string {
  const v = Deno.env.get(name);
  return v ?? fallback;
}

const SUPABASE_URL = env("SUPABASE_URL");
const SUPABASE_ANON_KEY = env("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_CAL_CLIENT_ID = env("GOOGLE_CAL_CLIENT_ID");
const GOOGLE_CAL_CLIENT_SECRET = env("GOOGLE_CAL_CLIENT_SECRET");

function b64urlEncode(s: string) {
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlDecode(s: string) {
  const pad = (4 - (s.length % 4)) % 4;
  const str = s.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(pad);
  return atob(str);
}

async function getUserFromAuthHeader(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await sb.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CAL_CLIENT_ID,
    client_secret: GOOGLE_CAL_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`token exchange failed: ${resp.status}`);
  return await resp.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CAL_CLIENT_ID,
    client_secret: GOOGLE_CAL_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) throw new Error(`token refresh failed: ${resp.status}`);
  return await resp.json();
}

function makeOAuthUrl(origin: string, state: string) {
  const redirect = `${origin}/calendar_proxy/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CAL_CLIENT_ID,
    redirect_uri: redirect,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
      // Uncomment to allow event creation later
      // "https://www.googleapis.com/auth/calendar.events",
    ].join(" "),
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, redirect };
}

async function upsertCalendarAccount(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number; scope?: string },
  email?: string,
) {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { data: existing } = await sb
    .from("calendar_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  const row = {
    user_id: userId,
    provider: "google",
    email: email ?? null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry: tokenExpiry,
    scopes: tokens.scope ? tokens.scope.split(" ") : ["https://www.googleapis.com/auth/calendar.readonly"],
    updated_at: new Date().toISOString(),
  } as any;

  if (existing?.id) {
    await sb.from("calendar_accounts").update(row).eq("id", existing.id);
  } else {
    await sb.from("calendar_accounts").insert(row);
  }
}

async function getTokensForUser(userId: string) {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb
    .from("calendar_accounts")
    .select("id, access_token, refresh_token, token_expiry")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listCalendarIds(accessToken: string): Promise<string[]> {
  const calendars: string[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) throw new Error(`calendarList failed: ${resp.status}`);
    const json: any = await resp.json();
    for (const item of json.items ?? []) calendars.push(item.id);
    pageToken = json.nextPageToken;
  } while (pageToken);
  return calendars.length ? calendars : ["primary"];
}

async function fetchFreeBusy(accessToken: string, timeMin: string, timeMax: string) {
  const calendars = await listCalendarIds(accessToken);
  const body = {
    timeMin,
    timeMax,
    items: calendars.map((id) => ({ id })),
  };
  const resp = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`freeBusy failed: ${resp.status}`);
  return await resp.json();
}

async function fetchEvents(accessToken: string, timeMin: string, timeMax: string) {
  const calendars = await listCalendarIds(accessToken);
  const results: any[] = [];
  for (const id of calendars) {
    let pageToken: string | undefined = undefined;
    do {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`);
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!resp.ok) throw new Error(`events list failed: ${resp.status}`);
      const json: any = await resp.json();
      for (const e of json.items ?? []) {
        const start = e.start?.dateTime || (e.start?.date ? `${e.start.date}T00:00:00Z` : undefined);
        const end = e.end?.dateTime || (e.end?.date ? `${e.end.date}T00:00:00Z` : undefined);
        if (!start || !end) continue;
        results.push({
          id: e.id,
          calendarId: id,
          title: e.summary || '(no title)',
          start,
          end,
          allDay: Boolean(e.start?.date) || Boolean(e.end?.date),
          location: e.location || null,
          htmlLink: e.htmlLink || null,
        });
      }
      pageToken = json.nextPageToken;
    } while (pageToken);
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    // Force HTTPS for redirect_uri to avoid Google redirect_uri_mismatch
    const origin = `https://${url.host}`;
    const pathname = url.pathname.replace(/^\/calendar_proxy/, "");

    if (pathname === "/oauth/start") {
      let user = await getUserFromAuthHeader(req);
      if (!user) {
        const token = url.searchParams.get("token");
        if (token) {
          const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
          const { data } = await sb.auth.getUser();
          user = data.user ?? null;
        }
      }
      if (!user) return new Response("Unauthorized", { status: 401 });
      const returnUrl = url.searchParams.get("return_url") || undefined;
      const stateObj = { uid: user.id, ts: Date.now(), returnUrl };
      const state = b64urlEncode(JSON.stringify(stateObj));
      const { url: authUrl } = makeOAuthUrl(origin, state);
      return Response.redirect(authUrl, 302);
    }

    if (pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return new Response("Missing code/state", { status: 400 });
      let uid = "";
      let returnUrl: string | undefined = undefined;
      try {
        const decoded = JSON.parse(b64urlDecode(state));
        uid = decoded.uid;
        returnUrl = decoded.returnUrl;
      } catch {
        return new Response("Invalid state", { status: 400 });
      }
      const redirect = `${origin}/calendar_proxy/callback`;
      const tokens = await exchangeCodeForTokens(code, redirect);
      await upsertCalendarAccount(uid, tokens);
      if (returnUrl) {
        return Response.redirect(returnUrl, 302);
      }
      const successHtml = `<!doctype html><meta charset="utf-8"><title>Connected</title><body style="font-family:system-ui;padding:24px;">Calendar connected. You can close this window.</body>`;
      return new Response(successHtml, { headers: { "Content-Type": "text/html" } });
    }

    if (pathname === "/freebusy") {
      const user = await getUserFromAuthHeader(req);
      if (!user) return new Response("Unauthorized", { status: 401 });
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      if (!start || !end) return new Response("Missing start/end", { status: 400 });
      let ca = await getTokensForUser(user.id);
      if (!ca?.access_token) return new Response("Not connected", { status: 404 });
      let accessToken = ca.access_token;
      const expiry = ca.token_expiry ? new Date(ca.token_expiry).getTime() : 0;
      if (Date.now() > expiry - 60_000 && ca.refresh_token) {
        try {
          const refreshed = await refreshAccessToken(ca.refresh_token);
          accessToken = refreshed.access_token;
          await upsertCalendarAccount(user.id, refreshed);
        } catch (_) {
          // ignore refresh errors; will try with existing
        }
      }
      const data = await fetchFreeBusy(accessToken, start, end);
      return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    }

    if (pathname === "/events") {
      const user = await getUserFromAuthHeader(req);
      if (!user) return new Response("Unauthorized", { status: 401 });
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      if (!start || !end) return new Response("Missing start/end", { status: 400 });
      let ca = await getTokensForUser(user.id);
      if (!ca?.access_token) return new Response("Not connected", { status: 404 });
      let accessToken = ca.access_token;
      const expiry = ca.token_expiry ? new Date(ca.token_expiry).getTime() : 0;
      if (Date.now() > expiry - 60_000 && ca.refresh_token) {
        try {
          const refreshed = await refreshAccessToken(ca.refresh_token);
          accessToken = refreshed.access_token;
          await upsertCalendarAccount(user.id, refreshed);
        } catch (_) {}
      }
      const data = await fetchEvents(accessToken, start, end);
      return new Response(JSON.stringify({ events: data }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


