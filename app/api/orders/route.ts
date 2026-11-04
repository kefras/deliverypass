import { randomUUID } from "node:crypto";
import { database } from "@/lib/db";
import { orderInput } from "@/lib/validation";
import { toOrder } from "@/lib/order-store";
import { ApiError,currentUser,apiError,assertOrigin,json,rateLimit,readJson } from "@/lib/security";
import { checkedOrder } from "@/lib/check-order";
export const dynamic="force-dynamic";
export async function GET(){try{const user=await currentUser();const rows=await database()`SELECT * FROM delivery_orders WHERE owner_id=${user.id} ORDER BY created_at DESC LIMIT 1000`;return json({orders:rows.map(toOrder)});}catch(e){return apiError(e);}}
export async function POST(request:Request){try{
  assertOrigin(request);const user=await currentUser();await rateLimit("order-write",user.id,60,60);
  const result=await checkedOrder(orderInput.parse(await readJson(request)));
  const id="DP-"+randomUUID();
  const rows=await database()`INSERT INTO delivery_orders (id,owner_id,data,verification,status) VALUES (${id},${user.id},${JSON.stringify(result.fields)}::jsonb,${result.verification},${result.status}) RETURNING *`;
  return json({order:toOrder(rows[0])},201);
}catch(e){return apiError(e);}}
