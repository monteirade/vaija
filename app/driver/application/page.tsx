import { SiteHeader } from "@/components/site-header";
import { DriverApplicationForm } from "./application-form";

export default function DriverApplicationPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto mb-8 max-w-lg text-center">
          <h1 className="text-2xl font-bold">Quero ser motorista</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Rentabilize o seu veículo disponível. Candidate-se e a nossa equipa entra em contacto.
          </p>
        </div>
        <DriverApplicationForm />
      </main>
    </>
  );
}
