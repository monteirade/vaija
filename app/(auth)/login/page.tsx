import { Card } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : "";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/">
            <BrandLogo className="text-2xl" />
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Entrar na sua conta</p>
        </div>
        <Card>
          <LoginForm next={next} />
        </Card>
      </div>
    </main>
  );
}
