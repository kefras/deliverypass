"use client";
type AuthClient = ReturnType<typeof import("@neon/auth/next").createAuthClient>;
let client: Promise<AuthClient> | undefined;
// Loading the browser SDK on demand also supports edge SSR hosts.
export function getAuthClient(): Promise<AuthClient> {
  return client ??= import("@neon/auth/next").then(({createAuthClient}) => createAuthClient());
}
