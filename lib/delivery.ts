export const fixtures = [
  { code: "LA-11-W06-TC-10", label: "Lagos · sample location" },
  { code: "FC-03-B06-AG-12", label: "FCT · sample location" },
  { code: "EN-05-V19-CD-22", label: "Enugu · sample location" },
  { code: "OG-14-T18-BN-16", label: "Ogun · sample location" },
];
export const sandboxFixtures = [
  {code:"FC-01-A01-KP-27",label:"NIPOST sandbox · public building"},
  {code:"FC-01-A01-LR-01",label:"NIPOST sandbox · public building"},
];
export type PostcodeMode = "demo" | "sandbox" | "live";
export type PostcodeReply = {mode:PostcodeMode;valid?:boolean;code?:string;error?:string;suggestions?:{code:string;label:string}[]};
export function normalizeCode(input: string) {
  const raw = input.toUpperCase().replace(/[\s-]/g, "");
  return raw.length === 11 ? `${raw.slice(0,2)}-${raw.slice(2,4)}-${raw.slice(4,7)}-${raw.slice(7,9)}-${raw.slice(9)}` : input.trim().toUpperCase();
}
export function wellFormed(code: string) { return /^[A-Z]{2}-\d{2}-[A-Z0-9]{3}-[A-Z]{2}-\d{2}$/.test(code); }
export type Order = {
  id: string; name: string; phone: string; item: string; code: string;
  address: string; instructions: string; date: string;
  verification: PostcodeMode | "unchecked";
  status: "Awaiting check" | "Ready to dispatch" | "Dispatched";
};
export const initialOrders: Order[] = [
 {id:"DP-1048", name:"Ada Okafor", phone:"08000000001", item:"Everyday tote · 1 item", code:fixtures[0].code, address:"Sample address, Lagos",instructions:"Call on arrival. Please leave with the recipient.",date:"2026-11-04T09:15:00+01:00",verification:"demo",status:"Ready to dispatch"},
 {id:"DP-1047", name:"Tunde Adeyemi", phone:"08000000002", item:"Linen shirt · 2 items",code:fixtures[1].code,address:"Sample address, Abuja",instructions:"Use the main entrance.",date:"2026-11-04T08:40:00+01:00",verification:"demo",status:"Ready to dispatch"},
 {id:"DP-1046", name:"Zainab Bello", phone:"08000000003",item:"Ceramic mug · 1 item",code:"",address:"Address awaiting postcode",instructions:"Please call before delivery.",date:"2026-11-03T15:10:00+01:00",verification:"unchecked",status:"Awaiting check"},
 {id:"DP-1045", name:"Chidi Eze", phone:"08000000004",item:"Desk organiser · 1 item",code:fixtures[2].code,address:"Sample address, Enugu",instructions:"Deliver to reception.",date:"2026-11-03T12:30:00+01:00",verification:"demo",status:"Dispatched"},
 {id:"DP-1044", name:"Bisi Akinola", phone:"08000000005",item:"Cotton set · 3 items",code:fixtures[3].code,address:"Sample address, Ogun",instructions:"Call when nearby.",date:"2026-11-02T10:20:00+01:00",verification:"demo",status:"Dispatched"},
];
