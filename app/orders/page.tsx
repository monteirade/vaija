import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");
  if (user.profile.role !== "customer") redirect("/dashboard");

  const repo = getRepository();
  const orders = await repo.listOrdersByCustomer(user.profile.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">Os meus pedidos</h1>
        {orders.length === 0 ? (
          <Card>
            <CardDescription>Ainda não tem pedidos.</CardDescription>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="block">
                <Card className="flex flex-row items-center justify-between hover:border-brand-yellow/50">
                  <div>
                    <CardTitle>{order.public_order_number}</CardTitle>
                    <CardDescription>
                      {order.pickup_address} → {order.destination_address}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "brand"}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                    <p className="mt-1 text-sm text-muted-foreground">€{order.total_price.toFixed(2)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
