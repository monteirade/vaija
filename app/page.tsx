import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, PackageSearch, UserPlus, MapPinned, Boxes, HandHelping } from "lucide-react";

const USE_CASES = [
  { icon: Boxes, title: "Materiais", description: "Transporte de materiais de construção e outros." },
  { icon: Truck, title: "Entulho", description: "Remoção e transporte de entulho." },
  { icon: HandHelping, title: "Equipa + ferramentas", description: "Leve a sua equipa e ferramentas ao local de trabalho." },
  { icon: PackageSearch, title: "Mudanças", description: "Mudança de casa ou escritório, com ou sem ajudantes." },
  { icon: MapPinned, title: "Outro", description: "Descreva o que precisa transportar e nós tratamos do resto." },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-yellow">
              Norte de Portugal · até Aveiro
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Transporte quando precisa.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A Vai Já liga-o a motoristas com veículos disponíveis para transportar o que precisar —
              agora ou agendado. Materiais, entulho, mudanças ou equipa com ferramentas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/request/new">
                <Button size="lg">Pedir transporte</Button>
              </Link>
              <Link href="/change/new">
                <Button size="lg" variant="secondary">
                  Fazer uma mudança
                </Button>
              </Link>
              <Link href="/driver/application">
                <Button size="lg" variant="outline">
                  <UserPlus className="size-4" />
                  Quero ser motorista
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-xl font-semibold">O que pode transportar</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {USE_CASES.map((useCase) => (
                <Card key={useCase.title}>
                  <CardHeader>
                    <useCase.icon className="mb-2 size-6 text-brand-yellow" />
                    <CardTitle>{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{useCase.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-xl font-semibold">Como funciona</h2>
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardTitle>1. Peça</CardTitle>
              <CardDescription className="mt-2">
                Indique recolha, destino, carga e veículo. Veja logo a distância e o preço.
              </CardDescription>
            </Card>
            <Card>
              <CardTitle>2. Acompanhe</CardTitle>
              <CardDescription className="mt-2">
                Um motorista aceita o pedido e acompanha em tempo real até à entrega.
              </CardDescription>
            </Card>
            <Card>
              <CardTitle>3. Receba</CardTitle>
              <CardDescription className="mt-2">
                Confirme a entrega e reveja o histórico e o resumo financeiro no seu painel.
              </CardDescription>
            </Card>
          </ol>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Vai Já — protótipo de demonstração. Nenhuma operação de transporte ou pagamento é real.
      </footer>
    </>
  );
}
