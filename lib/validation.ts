import { z } from "zod";
export const orderInput=z.object({
  name:z.string().trim().min(1).max(80),
  phone:z.string().trim().regex(/^\+?[0-9\s()\-]{7,20}$/),
  item:z.string().trim().max(120).default("New order"),
  code:z.string().trim().max(30).default(""),
  address:z.string().trim().min(1).max(400),
  instructions:z.string().trim().max(500).default(""),
  draft:z.boolean().default(false),
}).strict();
export const statusInput=z.object({status:z.enum(["Dispatched","Delivered","Archived","Awaiting check"]),version:z.number().int().positive()}).strict();
export const profileInput=z.object({storeName:z.string().trim().min(1).max(100)}).strict();
export function safeReturnPath(value:string|null){return value?.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")?value:"/dashboard";}
export function allowedTransition(from:string,to:string){return to==="Archived"||from==="Ready to dispatch"&&to==="Dispatched"||from==="Dispatched"&&to==="Delivered"||from==="Archived"&&to==="Awaiting check";}
