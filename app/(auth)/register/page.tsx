import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/">
            <BrandLogo className="text-2xl" />
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Criar conta de cliente</p>
        </div>
        <Card>
          <RegisterForm />
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          É motorista?{" "}
          <Link href="/driver/application" className="text-brand-yellow hover:underline">
            Candidate-se aqui
          </Link>
        </p>
      </div>
    </main>
  );
}
