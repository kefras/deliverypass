import { auth } from "@/lib/auth/server";
import { ApiError,apiError,assertOrigin,rateLimit,readJson } from "@/lib/security";
export const dynamic="force-dynamic";
type Context={params:Promise<{path:string[]}>};
const allowed=new Set(["sign-in/email","sign-up/email","sign-out","get-session","email-otp/send-verification-otp","email-otp/verify-email","request-password-reset","reset-password","change-password","revoke-other-sessions","list-sessions"]);
async function handle(request:Request,context:Context){try{
  const {path}=await context.params;const action=path.join("/");
  if(!allowed.has(action)&&!/^reset-password\/[A-Za-z0-9_-]+$/.test(action))throw new ApiError(404,"Not found.");
  if(request.method!=="GET"){
    assertOrigin(request);const body=await readJson(request.clone());
    if(body&&typeof body==="object"&&typeof body.email==="string")await rateLimit("auth:"+action,body.email.trim().toLowerCase(),action==="sign-in/email"?8:5,900);
    const ip=request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()??"local";
    await rateLimit("auth-ip",ip,60,900);
    const password=action==="sign-up/email"?body.password:["change-password","reset-password"].includes(action)?body.newPassword:undefined;
    if(["sign-up/email","change-password","reset-password"].includes(action)&&(typeof password!=="string"||password.length<12||password.length>128))throw new ApiError(400,"Use a password between 12 and 128 characters.");
  }
  const handlers=auth.handler();
  const response=await (request.method==="GET"?handlers.GET:handlers.POST)(request,context);
  response.headers.set("Cache-Control","no-store, private");
  return response;
}catch(error){return apiError(error);}}
export const GET=handle;export const POST=handle;
