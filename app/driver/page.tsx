import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/auth/actions";
import { getRepository } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvailabilityToggle } from "./availability-toggle";
import { SERVICE_TYPE_LABELS } from "@/lib/orders/labels";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";

export default async function DriverDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role === "admin") redirect("/admin");
  if (user.profile.role === "customer") redirect("/dashboard");

  const repo = getRepository();
  const driverProfile = await repo.getDriverProfileByUserId(user.profile.id);

  if (!driverProfile || driverProfile.status === "pending") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
          <Card>
            <CardTitle>Candidatura em análise</CardTitle>
            <CardDescription className="mt-2">
              A sua candidatura de motorista ainda está a ser analisada pela equipa Vai Já. Assim que for aprovada,
              este painel fica disponível.
            </CardDescription>
            <form action={logoutAction} className="mt-6">
              <Button variant="outline" type="submit">
                Sair
              </Button>
            </form>
          </Card>
        </main>
      </>
    );
  }

  if (driverProfile.status === "suspended") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
          <Card>
            <CardTitle>Conta suspensa</CardTitle>
            <CardDescription className="mt-2">Contacte a equipa Vai Já para mais informação.</CardDescription>
          </Card>
        </main>
      </>
    );
  }

  const [availableOrders, myOrders] = await Promise.all([
    repo.listAvailableOrdersForDriver(),
    repo.listOrdersByDriver(driverProfile.id),
  ]);
  const activeOrder = myOrders.find((o) => !["DELIVERED", "CANCELLED"].includes(o.status));
  const pastOrders = myOrders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Olá, {user.profile.full_name.split(" ")[0]}</h1>
            <p className="text-muted-foreground">Painel de motorista Vai Já.</p>
          </div>
          <div className="flex items-center gap-3">
            <AvailabilityToggle initial={driverProfile.availability_status} />
            <form action={logoutAction}>
              <Button variant="outline" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </div>

        {activeOrder && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Pedido atribuído</h2>
            <Link href={`/driver/orders/${activeOrder.id}`}>
              <Card className="border-brand-yellow/50 hover:border-brand-yellow">
                <CardHeader>
                  <CardTitle>{activeOrder.public_order_number}</CardTitle>
                  <CardDescription>
                    {activeOrder.pickup_address} → {activeOrder.destination_address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <Badge variant="brand">{ORDER_STATUS_LABELS[activeOrder.status]}</Badge>
                  <span className="text-sm text-muted-foreground">€{activeOrder.total_price.toFixed(2)}</span>
                </CardContent>
              </Card>
            </Link>
          </section>
        )}

        {!activeOrder && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Pedidos disponíveis</h2>
            {availableOrders.length === 0 ? (
              <Card>
                <CardDescription>Sem pedidos disponíveis neste momento.</CardDescription>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {availableOrders.map((order) => (
                  <Link key={order.id} href={`/driver/orders/${order.id}`}>
                    <Card className="h-full hover:border-brand-yellow/50">
                      <CardHeader>
                        <CardTitle>{order.public_order_number}</CardTitle>
                        <CardDescription>{SERVICE_TYPE_LABELS[order.service_type]}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {order.pickup_address} → {order.destination_address}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge>{order.vehicle_category}</Badge>
                          <span className="text-sm font-medium">€{order.total_price.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
          {pastOrders.length === 0 ? (
            <Card>
              <CardDescription>Sem transportes concluídos ainda.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-2">
              {pastOrders.map((order) => (
                <Link key={order.id} href={`/driver/orders/${order.id}`} className="block">
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
