import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vai Já — Transporte quando precisa",
  description:
    "Vai Já liga clientes particulares e empresas a motoristas com veículos disponíveis para transporte imediato ou agendado no Norte de Portugal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
