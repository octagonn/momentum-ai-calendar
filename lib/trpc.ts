import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback for development
  if (__DEV__) {
    return "http://localhost:3000";
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

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
        url: "http://localhost:3000/api/trpc",
        transformer: superjson,
      }),
    ],
  });
}

export { trpcClient };