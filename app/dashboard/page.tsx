import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth/actions";
import { getRepository } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "admin") redirect("/admin");
  if (user.profile.role === "driver") redirect("/driver");

  const repo = getRepository();
  const orders = await repo.listOrdersByCustomer(user.profile.id);
  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Olá, {user.profile.full_name.split(" ")[0]}</h1>
            <p className="text-muted-foreground">O seu painel de cliente Vai Já.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/request/new">
              <Button>Novo transporte</Button>
            </Link>
            <form action={logoutAction}>
              <Button variant="outline" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Pedidos ativos</h2>
          {activeOrders.length === 0 ? (
            <Card>
              <CardDescription>Ainda não tem pedidos ativos.</CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activeOrders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="hover:border-brand-yellow/50">
                    <CardHeader>
                      <CardTitle>{order.public_order_number}</CardTitle>
                      <CardDescription>
                        {order.pickup_address} → {order.destination_address}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <span className="text-sm font-medium text-brand-yellow">
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span className="text-sm text-muted-foreground">€{order.total_price.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Histórico</h2>
            <Link href="/orders" className="text-sm text-brand-yellow hover:underline">
              Ver todos
            </Link>
          </div>
          {orders.length === 0 ? (
            <Card>
              <CardDescription>Sem pedidos anteriores.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} className="block">
                  <Card className="flex flex-row items-center justify-between py-3">
                    <span className="text-sm">{order.public_order_number}</span>
                    <span className="text-sm text-muted-foreground">{ORDER_STATUS_LABELS[order.status]}</span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
