import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/cms/auth";
import LoginForm from "@/components/cms/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (session) redirect("/edit");

  return <LoginForm />;
}
