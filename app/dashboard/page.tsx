import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import Dashboard from "@/components/delivery-dashboard";
export const dynamic="force-dynamic";
export default async function Page(){const {data:session}=await getAuth().getSession({query:{disableCookieCache:"true"}});if(!session?.user)redirect("/auth/sign-in");if(!session.user.emailVerified)redirect("/auth/verify");return <Dashboard/>;}
