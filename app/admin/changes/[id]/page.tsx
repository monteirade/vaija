import { notFound } from "next/navigation";
import { getRepository } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/card";
import { ChangeStatusControl } from "./change-status-control";

export default async function AdminChangeDetailPage(props: PageProps<"/admin/changes/[id]">) {
  const { id } = await props.params;
  const repo = getRepository();
  const changeRequest = await repo.getChangeRequestById(id);
  if (!changeRequest) notFound();

  const [customer, photos] = await Promise.all([
    repo.getProfileById(changeRequest.customer_id),
    repo.listChangeRequestPhotos(changeRequest.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Pedido de mudança</h1>

      <Card>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Cliente" value={customer?.full_name ?? "—"} />
          <Detail label="Contacto" value={customer?.phone ?? customer?.email ?? "—"} />
          <Detail label="Origem" value={changeRequest.pickup_address} />
          <Detail label="Destino" value={changeRequest.destination_address} />
          <Detail
            label="Data/hora"
            value={changeRequest.scheduled_at ? new Date(changeRequest.scheduled_at).toLocaleString("pt-PT") : "A combinar"}
          />
          <Detail label="Ajudantes" value={String(changeRequest.helpers_count)} />
        </dl>
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">Descrição</p>
          <p className="text-sm text-muted-foreground">{changeRequest.description}</p>
        </div>
      </Card>

      {photos.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Fotografias</CardTitle>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.id} src={`/api/uploads/${photo.storage_path}`} alt="Foto" className="size-24 rounded-lg border border-border object-cover" />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Estado</CardTitle>
        <ChangeStatusControl id={changeRequest.id} current={changeRequest.status} />
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
