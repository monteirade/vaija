import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { Button } from "./ui/button";
import { NotificationsBell } from "./notifications-bell";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/">
          <BrandLogo className="text-xl" />
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationsBell />
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  A minha conta
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
              <Link href="/register">
                <Button variant="primary" size="sm">
                  Criar conta
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
