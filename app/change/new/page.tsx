import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { ChangeRequestForm } from "./change-form";

export default async function NewChangeRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/change/new");
  if (user.profile.role !== "customer") redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4 py-10">
        <h1 className="mx-auto mb-8 max-w-lg text-2xl font-bold">Pedido de mudança</h1>
        <ChangeRequestForm />
      </main>
    </>
  );
}
