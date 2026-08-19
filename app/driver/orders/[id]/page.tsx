import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/orders/state-machine";
import { SERVICE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders/labels";
import { DriverOrderActions } from "./driver-order-actions";
import { LocationSharing } from "./location-sharing";
import { OrderMap } from "@/components/maps/order-map";
import { isTerminalStatus } from "@/lib/orders/state-machine";

export default async function DriverOrderDetailPage(props: PageProps<"/driver/orders/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role !== "driver") redirect("/dashboard");

  const repo = getRepository();
  const driverProfile = await repo.getDriverProfileByUserId(user.profile.id);
  if (!driverProfile || driverProfile.status !== "approved") redirect("/driver");

  const order = await repo.getOrderById(id);
  if (!order) notFound();

  const isMine = order.driver_id === driverProfile.id;
  const isAvailable = order.status === "SEARCHING_DRIVER" && !order.driver_id;
  if (!isMine && !isAvailable) notFound();

  const customer = await repo.getProfileById(order.customer_id);
  const photos = await repo.listOrderPhotos(order.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>{order.public_order_number}</CardTitle>
              <p className="text-sm text-muted-foreground">{SERVICE_TYPE_LABELS[order.service_type]}</p>
            </div>
            <Badge data-order-status variant="brand">{ORDER_STATUS_LABELS[order.status]}</Badge>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Detail label="Recolha" value={order.pickup_address} />
            <Detail label="Destino" value={order.destination_address} />
            <Detail label="Distância" value={order.distance_km ? `${order.distance_km} km` : "—"} />
            <Detail label="Carga" value={order.cargo_description ?? "—"} />
            <Detail label="Peso" value={order.cargo_weight_kg ? `${order.cargo_weight_kg} kg` : "—"} />
            <Detail label="Volumes" value={String(order.package_count ?? "—")} />
            <Detail label="Ajudantes" value={order.needs_helpers ? `${order.helpers_count} × ${order.helper_hours}h` : "Não"} />
            <Detail label="Passageiro" value={order.passenger ? "Sim" : "Não"} />
            <Detail label="Pagamento" value={PAYMENT_METHOD_LABELS[order.payment_method]} />
            <Detail label="Total" value={`€${order.total_price.toFixed(2)}`} />
            {customer && <Detail label="Cliente" value={customer.full_name} />}
          </dl>

          {order.pickup_lat != null && order.pickup_lng != null && order.destination_lat != null && order.destination_lng != null && (
            <div className="mt-4">
              <OrderMap
                pickup={{ lat: order.pickup_lat, lng: order.pickup_lng, label: order.pickup_address }}
                destination={{ lat: order.destination_lat, lng: order.destination_lng, label: order.destination_address }}
              />
            </div>
          )}

          {isMine && !isTerminalStatus(order.status) && (
            <div className="mt-4">
              <LocationSharing />
            </div>
          )}

          {photos.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Fotografias</p>
              <div className="flex flex-wrap gap-3">
                {photos.map((photo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={photo.id}
                    src={`/api/uploads/${photo.storage_path}`}
                    alt="Foto da carga"
                    className="size-20 rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <DriverOrderActions order={order} isMine={isMine} isAvailable={isAvailable} />
          </div>
        </Card>
      </main>
    </>
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
