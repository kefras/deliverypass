import { database } from "@/lib/db";
import { ownedOrder,toOrder } from "@/lib/order-store";
import { checkedOrder } from "@/lib/check-order";
import { orderInput,statusInput,allowedTransition } from "@/lib/validation";
import { ApiError,currentUser,apiError,assertOrigin,json,rateLimit,readJson } from "@/lib/security";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,context:Context){try{const user=await currentUser();const {id}=await context.params;const row=await ownedOrder(id,user.id);if(!row)throw new ApiError(404,"Order not found.");return json({order:toOrder(row)});}catch(e){return apiError(e);}}
export async function PUT(request:Request,context:Context){try{
  assertOrigin(request);const user=await currentUser();await rateLimit("order-write",user.id,60,60);const {id}=await context.params;
  const row=await ownedOrder(id,user.id);if(!row)throw new ApiError(404,"Order not found.");
  if(!["Awaiting check","Ready to dispatch"].includes(String(row.status)))throw new ApiError(409,"Only orders awaiting dispatch can be edited.");
  const raw=await readJson(request);const version=raw.version;delete raw.version;
  if(!Number.isInteger(version)||version!==Number(row.version))throw new ApiError(409,"The order changed. Refresh before editing.");
  const result=await checkedOrder(orderInput.parse(raw));
  const rows=await database()`UPDATE delivery_orders SET data=${JSON.stringify(result.fields)}::jsonb,verification=${result.verification},status=${result.status},version=version+1,updated_at=now() WHERE id=${id} AND owner_id=${user.id} AND version=${version} RETURNING *`;
  if(!rows[0])throw new ApiError(409,"The order changed. Refresh and try again.");return json({order:toOrder(rows[0])});
}catch(e){return apiError(e);}}
export async function PATCH(request:Request,context:Context){try{
  assertOrigin(request);const user=await currentUser();await rateLimit("order-write",user.id,60,60);const {id}=await context.params;const input=statusInput.parse(await readJson(request));
  const row=await ownedOrder(id,user.id);if(!row)throw new ApiError(404,"Order not found.");
  if(!allowedTransition(String(row.status),input.status))throw new ApiError(409,"This status change is not allowed.");
  const rows=await database()`UPDATE delivery_orders SET status=${input.status},verification=CASE WHEN ${input.status}='Awaiting check' THEN 'unchecked' ELSE verification END,version=version+1,updated_at=now() WHERE id=${id} AND owner_id=${user.id} AND version=${input.version} RETURNING *`;
  if(!rows[0])throw new ApiError(409,"The order changed. Refresh and try again.");return json({order:toOrder(rows[0])});
}catch(e){return apiError(e);}}
