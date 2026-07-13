import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EditorShell from "@/components/cms/EditorShell";
import { SESSION_COOKIE, verifySession } from "@/lib/cms/auth";
import { isPersistent } from "@/lib/cms/store";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  // The layout has already established that this visitor holds the unlock key.
  // This is the second factor: a valid session.
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/edit/login");

  return <EditorShell persistentDraft={isPersistent()} />;
}
