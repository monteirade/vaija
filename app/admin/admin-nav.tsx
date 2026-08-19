"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/drivers", label: "Motoristas" },
  { href: "/admin/customers", label: "Clientes" },
  { href: "/admin/changes", label: "Mudanças" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-brand-yellow text-brand-yellow-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
