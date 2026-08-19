import Link from "next/link";
import { getRepository } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const searchParams = await props.searchParams;
  const statusFilter = typeof searchParams.status === "string" ? searchParams.status : "all";

  const repo = getRepository();
  const allOrders = await repo.listAllOrders();
  const orders = statusFilter === "all" ? allOrders : allOrders.filter((o) => o.status === statusFilter);

  const filters: { value: string; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "SEARCHING_DRIVER", label: "Pendentes" },
    { value: "IN_TRANSIT", label: "Em transporte" },
    { value: "DELIVERED", label: "Concluídos" },
    { value: "CANCELLED", label: "Cancelados" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Pedidos</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/orders" : `/admin/orders?status=${f.value}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === f.value ? "bg-brand-yellow text-brand-yellow-foreground" : "bg-surface-2 text-muted-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardDescription>Sem pedidos nesta vista.</CardDescription>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
              <Card className="flex flex-row flex-wrap items-center justify-between gap-3 hover:border-brand-yellow/50">
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
    </div>
  );
}
