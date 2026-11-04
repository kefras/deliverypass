import "server-only";
import { orderInput } from "@/lib/validation";
import { ApiError } from "@/lib/security";
import { normalizeCode,wellFormed } from "@/lib/delivery";
export async function checkedOrder(data:ReturnType<typeof orderInput.parse>){
  const {draft,...fields}=data;fields.code=normalizeCode(fields.code);
  if(draft)return {fields,verification:"unchecked",status:"Awaiting check"};
  if(!wellFormed(fields.code))throw new ApiError(400,"Check a complete postcode or save this order as a draft.");
  const key=process.env.POSTCODE_API_KEY;
  if(!key)throw new ApiError(503,"Postcode validation is unavailable. Save a draft to keep the order.");
  try{
    const u=new URL("https://api.postcode.gov.ng/v1/lookup");u.searchParams.set("code",fields.code);u.searchParams.set("level","1");
    const response=await fetch(u,{headers:{"X-API-Key":key},signal:AbortSignal.timeout(8000)});
    const body=await response.json() as {data?:{valid?:unknown}};
    if(!response.ok||body.data?.valid!==true)throw new ApiError(422,"NIPOST could not validate this postcode. You can save a draft and retry later.");
    return {fields,verification:/^nipost_(pk_)?test_/.test(key)?"sandbox":"live",status:"Ready to dispatch"};
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(503,"The postcode service is unavailable. Save a draft and retry later.");}
}
