import { useEffect, useMemo, useState, useCallback } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { Platform } from "react-native";

interface SupabaseContextType {
  isReady: boolean;
  url: string | null;
  anonKey: string | null;
  setKeys: (url: string, anonKey: string) => void;
}

export const [SupabaseProvider, useSupabase] = createContextHook<SupabaseContextType>(() => {
  const [url, setUrl] = useState<string | null>(process.env.EXPO_PUBLIC_SUPABASE_URL ?? null);
  const [anonKey, setAnonKey] = useState<string | null>(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null);

  useEffect(() => {
    console.log("SupabaseProvider init", { platform: Platform.OS, hasUrl: !!url, hasKey: !!anonKey });
  }, [url, anonKey]);

  const setKeys = useCallback((u: string, k: string) => {
    setUrl(u);
    setAnonKey(k);
  }, []);

  return useMemo(() => ({
    isReady: Boolean(url && anonKey),
    url,
    anonKey,
    setKeys,
  }), [url, anonKey, setKeys]);
});