import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
// Read secrets inside the request, after the host has supplied its bindings.
export function getAuth(){return createNeonAuth({
  baseUrl:process.env.NEON_AUTH_BASE_URL!,
  cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET!,sameSite:"lax",sessionDataTtl:60},
  logLevel:"silent",
});}
