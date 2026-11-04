import "server-only";
import { database } from "@/lib/db";
import type { Order } from "@/lib/delivery";
export function toOrder(row:Record<string,unknown>):Order{
  const data=row.data as Omit<Order,"id"|"status"|"date"|"verification"|"version">;
  return {...data,id:String(row.id),date:new Date(String(row.created_at)).toISOString(),status:row.status as Order["status"],verification:row.verification as Order["verification"],version:Number(row.version)};
}
export async function ownedOrder(id:string,owner:string){const rows=await database()`SELECT * FROM delivery_orders WHERE id=${id} AND owner_id=${owner}`;return rows[0]??null;}
