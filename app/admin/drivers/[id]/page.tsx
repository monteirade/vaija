import { notFound } from "next/navigation";
import { getRepository } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";
import { VEHICLE_CATEGORIES } from "@/lib/pricing/config";
import { suspendDriverAction, reactivateDriverAction } from "@/lib/drivers/actions";
import Link from "next/link";

export default async function AdminDriverDetailPage(props: PageProps<"/admin/drivers/[id]">) {
  const { id } = await props.params;
  const repo = getRepository();
  const driverProfile = await repo.getDriverProfileById(id);
  if (!driverProfile) notFound();

  const [profile, vehicles, orders] = await Promise.all([
    repo.getProfileById(driverProfile.user_id),
    repo.listVehiclesByDriver(driverProfile.id),
    repo.listOrdersByDriver(driverProfile.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile?.full_name ?? "—"}</h1>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={driverProfile.status === "approved" ? "success" : "danger"}>{driverProfile.status}</Badge>
          <Badge>{driverProfile.availability_status}</Badge>
        </div>
      </div>

      <Card className="flex items-center justify-between">
        <CardDescription>Zona de operação: {driverProfile.service_area ?? "—"}</CardDescription>
        {driverProfile.status === "approved" ? (
          <form action={suspendDriverAction}>
            <input type="hidden" name="driverProfileId" value={driverProfile.id} />
            <Button size="sm" variant="danger" type="submit">
              Suspender
            </Button>
          </form>
        ) : (
          <form action={reactivateDriverAction}>
            <input type="hidden" name="driverProfileId" value={driverProfile.id} />
            <Button size="sm" variant="secondary" type="submit">
              Reativar
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-3">Veículos</CardTitle>
        {vehicles.length === 0 ? (
          <CardDescription>Sem veículos registados.</CardDescription>
        ) : (
          <ul className="space-y-2 text-sm">
            {vehicles.map((v) => (
              <li key={v.id} className="flex justify-between border-b border-border/60 py-1.5">
                <span>
                  {v.make} {v.model} · {v.registration}
                </span>
                <span className="text-muted-foreground">
                  {VEHICLE_CATEGORIES[v.category].label} · {v.capacity_kg} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-3">Pedidos</CardTitle>
        {orders.length === 0 ? (
          <CardDescription>Sem pedidos ainda.</CardDescription>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
                  <span>{order.public_order_number}</span>
                  <span className="text-muted-foreground">{ORDER_STATUS_LABELS[order.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
