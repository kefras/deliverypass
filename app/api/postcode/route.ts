import { fixtures, normalizeCode, wellFormed, searchQuery, suggestionCode } from "@/lib/delivery";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, {status, headers:{"Cache-Control":"no-store"}});
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const action = params.get("action") ?? "lookup";
  const key = process.env.POSTCODE_API_KEY;
  const mode = !key ? "demo" : /^nipost_(pk_)?test_/.test(key) ? "sandbox" : "live";
  if (action === "config") return json({mode});
  if (action !== "search" && action !== "lookup") return json({error:"Unsupported action."},400);
  const input = (params.get(action === "search" ? "q" : "code") ?? "").slice(0,80);
  const code = normalizeCode(input);
  if (action === "lookup" && !wellFormed(code)) return json({valid:false,mode,error:"Enter a full postcode, for example LA-11-W06-TC-10."},400);
  if (!key) {
    if (action === "search") {
      const query=input.toUpperCase().replace(/[\s-]/g,"");
      return json({mode,suggestions: fixtures.filter(x=>x.code.replaceAll("-","").includes(query)).slice(0,4)});
    }
    const match=fixtures.find(x=>x.code===code);
    return json({mode,valid:!!match,code,label:match?.label,error:match?undefined:"This code is not in the demo dataset. Try one of the sample postcodes."});
  }
  try {
    const upstream = new URL(action === "search" ? "/v1/search/autocomplete" : "/v1/lookup", "https://api.postcode.gov.ng");
    if(action === "search") upstream.searchParams.set("q",searchQuery(input));
    else { upstream.searchParams.set("code",code); upstream.searchParams.set("level","1"); }
    const response = await fetch(upstream,{headers:{"X-API-Key":key},signal:AbortSignal.timeout(8000)});
    if (!response.ok) return json({mode,error:response.status===401||response.status===403?"Postcode API access was refused. Check the server API key and access level.":"The postcode service is unavailable. Please try again."},502);
    const body=await response.json() as {data?:unknown};
    const data=body?.data;
    const fields=data && typeof data==="object" && !Array.isArray(data)?data as Record<string,unknown>:{};
    if(action === "lookup") {
      if(typeof fields.valid !== "boolean") return json({mode,error:"The postcode service returned an unexpected response."},502);
      return json({mode,code,valid:fields.valid,error:fields.valid?undefined:"The postcode service could not validate this code."});
    }
    const candidates=Array.isArray(data)?data:fields.suggestions??fields.results??fields.items??[];
    const suggestions=Array.isArray(candidates)?candidates.flatMap((x:unknown)=>{
      const item=x && typeof x==="object"?x as Record<string,unknown>:{};
      const raw=typeof x==="string"?x:item.postcode??item.code;
      const completion=typeof raw==="string"?suggestionCode(input,fields.segment,raw):null;
      return completion?[{code:completion,label:typeof item.label==="string"?item.label:"Select postcode"}]:[];
    }).slice(0,6):[];
    return json({mode,suggestions});
  } catch { return json({mode,error:"Could not reach the postcode service. Please try again."},502); }
}
