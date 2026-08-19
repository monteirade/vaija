import { notFound } from "next/navigation";
import { getRepository } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";
import { SERVICE_TYPE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders/labels";
import { AdminOrderControls } from "./admin-order-controls";

export default async function AdminOrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const repo = getRepository();
  const order = await repo.getOrderById(id);
  if (!order) notFound();

  const [customer, history, photos, allDrivers] = await Promise.all([
    repo.getProfileById(order.customer_id),
    repo.listOrderStatusHistory(order.id),
    repo.listOrderPhotos(order.id),
    repo.listDrivers(),
  ]);

  const assignedDriver = order.driver_id ? allDrivers.find((d) => d.id === order.driver_id) : null;
  const availableDrivers = allDrivers
    .filter((d) => d.status === "approved")
    .map((d) => ({
      driverProfileId: d.id,
      name: d.profile?.full_name ?? "—",
      availability: d.availability_status,
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.public_order_number}</h1>
          <p className="text-sm text-muted-foreground">{SERVICE_TYPE_LABELS[order.service_type]}</p>
        </div>
        <Badge variant={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "brand"}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <Card>
        <CardTitle className="mb-3">Detalhes</CardTitle>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Cliente" value={customer?.full_name ?? "—"} />
          <Detail label="Motorista" value={assignedDriver?.profile?.full_name ?? "Por atribuir"} />
          <Detail label="Recolha" value={order.pickup_address} />
          <Detail label="Destino" value={order.destination_address} />
          <Detail label="Distância" value={order.distance_km ? `${order.distance_km} km` : "—"} />
          <Detail label="Carga" value={order.cargo_description ?? "—"} />
          <Detail label="Veículo" value={order.vehicle_category} />
          <Detail label="Ajudantes" value={order.needs_helpers ? `${order.helpers_count} × ${order.helper_hours}h` : "Não"} />
          <Detail label="Pagamento" value={PAYMENT_METHOD_LABELS[order.payment_method]} />
          <Detail label="Estado pagamento" value={PAYMENT_STATUS_LABELS[order.payment_status]} />
          <Detail label="Total" value={`€${order.total_price.toFixed(2)}`} />
        </dl>
      </Card>

      {photos.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Fotografias</CardTitle>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.id} src={`/api/uploads/${photo.storage_path}`} alt="Foto da carga" className="size-24 rounded-lg border border-border object-cover" />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Gestão</CardTitle>
        <AdminOrderControls order={order} drivers={availableDrivers} />
      </Card>

      <Card>
        <CardTitle className="mb-3">Histórico</CardTitle>
        <ul className="space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex items-center justify-between text-muted-foreground">
              <span className="text-foreground">{ORDER_STATUS_LABELS[h.status]}</span>
              <span>{new Date(h.created_at).toLocaleString("pt-PT")}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-1.5 sm:block sm:border-0 sm:py-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
