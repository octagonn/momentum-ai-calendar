import { Platform } from "react-native";

export type SupabaseHeaders = {
  apikey: string;
  authorization: string;
  "Content-Type"?: string;
  Prefer?: string;
};

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

function getEnv(): SupabaseEnv | undefined {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? undefined;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? undefined;
  if (!url || !anonKey) return undefined;
  return { url, anonKey };
}

export function getHeaders(env?: SupabaseEnv): SupabaseHeaders | undefined {
  const cfg = env ?? getEnv();
  if (!cfg) return undefined;
  return {
    apikey: cfg.anonKey,
    authorization: `Bearer ${cfg.anonKey}`,
    "Content-Type": "application/json",
  };
}

export async function fromTable<T>(table: string, query: string = "*", env?: SupabaseEnv): Promise<T[]> {
  const cfg = env ?? getEnv();
  const headers = getHeaders(cfg);
  if (!cfg || !headers) {
    console.log("Supabase not configured. Skipping request.");
    return [] as T[];
  }
  const url = `${cfg.url}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch error ${res.status}: ${text}`);
  }
  return (await res.json()) as T[];
}

export async function upsert<T extends Record<string, unknown>>(table: string, rows: T | T[], env?: SupabaseEnv): Promise<T[]> {
  const cfg = env ?? getEnv();
  const headers = getHeaders(cfg);
  if (!cfg || !headers) {
    console.log("Supabase not configured. Skipping upsert.");
    return Array.isArray(rows) ? rows : [rows];
  }
  const url = `${cfg.url}/rest/v1/${encodeURIComponent(table)}`;
  const body = JSON.stringify(Array.isArray(rows) ? rows : [rows]);
  const res = await fetch(url, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates" }, body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert error ${res.status}: ${text}`);
  }
  return (await res.json()) as T[];
}

export async function patch<T extends Record<string, unknown>>(table: string, match: Record<string, string | number>, patchData: Partial<T>, env?: SupabaseEnv): Promise<number> {
  const cfg = env ?? getEnv();
  const headers = getHeaders(cfg);
  if (!cfg || !headers) {
    console.log("Supabase not configured. Skipping patch.");
    return 0;
  }
  const query = Object.entries(match)
    .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`)
    .join("&");
  const url = `${cfg.url}/rest/v1/${encodeURIComponent(table)}?${query}`;
  const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(patchData) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase patch error ${res.status}: ${text}`);
  }
  const contentRange = res.headers.get("content-range");
  if (!contentRange) return 0;
  const matchRes = /\d+-\d+\/(\d+)/.exec(contentRange);
  return matchRes ? Number(matchRes[1]) : 0;
}

export function isWeb() {
  return Platform.OS === "web";
}

export async function testConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const env = getEnv();
    if (!env) {
      return { connected: false, message: "Supabase environment variables not found" };
    }
    
    const headers = getHeaders(env);
    if (!headers) {
      return { connected: false, message: "Could not generate Supabase headers" };
    }
    
    // Try to fetch a simple health check
    const url = `${env.url}/rest/v1/`;
    const res = await fetch(url, { headers });
    
    if (res.ok) {
      return { connected: true, message: "Successfully connected to Supabase" };
    } else {
      const text = await res.text();
      return { connected: false, message: `Connection error: ${res.status} - ${text}` };
    }
  } catch (error) {
    return { 
      connected: false, 
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}
