import AuthScreen from "@/components/auth-screen";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{view:string}>}){const {view}=await params;if(!["sign-in","sign-up","verify","forgot-password","reset-password"].includes(view))notFound();return <AuthScreen view={view}/>;}
