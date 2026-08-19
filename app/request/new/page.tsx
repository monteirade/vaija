import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { RequestWizard } from "./request-wizard";

export default async function NewRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/request/new");
  if (user.profile.role !== "customer") redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4 py-10">
        <h1 className="mx-auto mb-8 max-w-2xl text-2xl font-bold">Pedir transporte</h1>
        <RequestWizard />
      </main>
    </>
  );
}
