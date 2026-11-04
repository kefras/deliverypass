import { database } from "@/lib/db";
import { currentUser,apiError,assertOrigin,json,readJson,rateLimit } from "@/lib/security";
import { profileInput } from "@/lib/validation";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await currentUser(false);const rows=await database()`SELECT store_name FROM seller_profiles WHERE owner_id=${user.id}`;return json({user:{name:user.name,email:user.email,emailVerified:user.emailVerified},storeName:rows[0]?.store_name??user.name+"’s store"});}catch(e){return apiError(e);}}
export async function PATCH(request:Request){try{assertOrigin(request);const user=await currentUser();await rateLimit("profile-write",user.id,30,60);const {storeName}=profileInput.parse(await readJson(request));await database()`INSERT INTO seller_profiles (owner_id,store_name) VALUES (${user.id},${storeName}) ON CONFLICT (owner_id) DO UPDATE SET store_name=excluded.store_name,updated_at=now()`;return json({storeName});}catch(e){return apiError(e);}}
