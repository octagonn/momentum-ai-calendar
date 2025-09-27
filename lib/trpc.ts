import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

// We're no longer using tRPC - everything goes through Supabase directly
// This file can be removed or kept for future use

let trpcClient: ReturnType<typeof trpc.createClient>;

try {
  trpcClient = trpc.createClient({
    links: [
      httpLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
} catch (error) {
  console.warn("Failed to create tRPC client:", error);
  // Create a fallback client that won't crash the app
  trpcClient = trpc.createClient({
    links: [
      httpLink({
        url: "http://localhost:3001/api/trpc",
        transformer: superjson,
      }),
    ],
  });
}

export { trpcClient };