import Link from "next/link";
import { getRepository } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const repo = getRepository();
  const [orders, drivers, applications, customers, changes] = await Promise.all([
    repo.listAllOrders(),
    repo.listDrivers(),
    repo.listDriverApplications(),
    repo.listCustomers(),
    repo.listChangeRequests(),
  ]);

  const pending = orders.filter((o) => o.status === "PENDING" || o.status === "SEARCHING_DRIVER").length;
  const active = orders.filter((o) => !["PENDING", "SEARCHING_DRIVER", "DELIVERED", "CANCELLED"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;
  const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
  const pendingApplications = applications.filter((a) => a.status === "pending").length;
  const pendingChanges = changes.filter((c) => c.status === "pending_review").length;

  const tiles = [
    { label: "Pedidos pendentes", value: pending, href: "/admin/orders" },
    { label: "Pedidos em transporte", value: active, href: "/admin/orders" },
    { label: "Pedidos concluídos", value: delivered, href: "/admin/orders" },
    { label: "Pedidos cancelados", value: cancelled, href: "/admin/orders" },
    { label: "Motoristas", value: drivers.length, href: "/admin/drivers" },
    { label: "Candidaturas pendentes", value: pendingApplications, href: "/admin/drivers" },
    { label: "Clientes", value: customers.length, href: "/admin/customers" },
    { label: "Mudanças por rever", value: pendingChanges, href: "/admin/changes" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Resumo</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="hover:border-brand-yellow/50">
              <CardTitle className="text-3xl">{tile.value}</CardTitle>
              <CardDescription className="mt-1">{tile.label}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
