import "server-only";
import { createHmac } from "node:crypto";
import { ZodError } from "zod";
import { auth } from "@/lib/auth/server";
import { database } from "@/lib/db";
export class ApiError extends Error{constructor(public status:number,message:string){super(message);}}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
export function apiError(error:unknown){if(error instanceof ApiError)return json({error:error.message},error.status);if(error instanceof ZodError)return json({error:"Check the supplied fields and try again."},400);return json({error:"The request could not be completed. Please try again."},503);}
export async function currentUser(verified=true){
  const {data:session}=await auth.getSession({query:{disableCookieCache:"true"}});
  if(!session?.user)throw new ApiError(401,"Please sign in to continue.");
  if(verified&&!session.user.emailVerified)throw new ApiError(403,"Verify your email before accessing your workspace.");
  return session.user;
}
export function assertOrigin(request:Request){
  const origin=request.headers.get("origin");
  const expected=process.env.APP_URL;
  if(!expected||origin!==new URL(expected).origin)throw new ApiError(403,"This request’s origin is not allowed.");
  if(request.headers.get("sec-fetch-site")==="cross-site")throw new ApiError(403,"Cross-site requests are not allowed.");
}
export async function readJson(request:{headers:Headers;text:()=>Promise<string>}){
  if(!request.headers.get("content-type")?.startsWith("application/json"))throw new ApiError(415,"Send JSON data.");
  if(Number(request.headers.get("content-length")??0)>16384)throw new ApiError(413,"Request is too large.");
  const text=await request.text();if(text.length>16384)throw new ApiError(413,"Request is too large.");
  try{const data=JSON.parse(text);if(!data||typeof data!=="object"||Array.isArray(data))throw new Error();return data;}catch{throw new ApiError(400,"Invalid request data.");}
}
export async function rateLimit(scope:string,identity:string,limit:number,seconds:number){
  const secret=process.env.NEON_AUTH_COOKIE_SECRET;if(!secret)throw new ApiError(503,"Service configuration is incomplete.");
  const hash=createHmac("sha256",secret).update(`${scope}:${identity}`).digest("hex");
  const sql=database();
  const rows=await sql`INSERT INTO request_limits (key_hash,hits,reset_at) VALUES (${hash},1,now()+${seconds}*interval '1 second') ON CONFLICT (key_hash) DO UPDATE SET hits=CASE WHEN request_limits.reset_at<now() THEN 1 ELSE request_limits.hits+1 END, reset_at=CASE WHEN request_limits.reset_at<now() THEN now()+${seconds}*interval '1 second' ELSE request_limits.reset_at END RETURNING hits`;
  if(Number(rows[0].hits)>limit)throw new ApiError(429,"Too many attempts. Please wait and try again.");
}
