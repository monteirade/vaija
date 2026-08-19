import Link from "next/link";
import { getRepository } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHANGE_REQUEST_STATUS_LABELS } from "@/lib/orders/labels";

export default async function AdminChangesPage() {
  const repo = getRepository();
  const changeRequests = await repo.listChangeRequests();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Pedidos de mudança</h1>
      {changeRequests.length === 0 ? (
        <Card>
          <CardDescription>Sem pedidos de mudança.</CardDescription>
        </Card>
      ) : (
        <div className="space-y-2">
          {changeRequests.map((cr) => (
            <Link key={cr.id} href={`/admin/changes/${cr.id}`} className="block">
              <Card className="flex flex-row flex-wrap items-center justify-between gap-3 hover:border-brand-yellow/50">
                <div>
                  <CardTitle>
                    {cr.pickup_address} → {cr.destination_address}
                  </CardTitle>
                  <CardDescription>{cr.description}</CardDescription>
                </div>
                <Badge variant={cr.status === "confirmed" ? "success" : cr.status === "cancelled" ? "danger" : "brand"}>
                  {CHANGE_REQUEST_STATUS_LABELS[cr.status]}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
