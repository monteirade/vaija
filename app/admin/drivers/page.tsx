import Link from "next/link";
import { getRepository } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApproveApplicationButton } from "./approve-button";
import { VEHICLE_CATEGORIES } from "@/lib/pricing/config";

export default async function AdminDriversPage() {
  const repo = getRepository();
  const [applications, drivers] = await Promise.all([repo.listDriverApplications(), repo.listDrivers()]);
  const pendingApplications = applications.filter((a) => a.status === "pending");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-4 text-2xl font-bold">Motoristas</h1>

        <h2 className="mb-3 text-lg font-semibold">Candidaturas pendentes</h2>
        {pendingApplications.length === 0 ? (
          <Card>
            <CardDescription>Sem candidaturas pendentes.</CardDescription>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingApplications.map((app) => (
              <Card key={app.id} className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{app.full_name}</CardTitle>
                  <CardDescription>
                    {app.email} · {app.phone} · {VEHICLE_CATEGORIES[app.vehicle_category].label} · {app.service_area}
                  </CardDescription>
                </div>
                <ApproveApplicationButton applicationId={app.id} />
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Motoristas ativos</h2>
        {drivers.length === 0 ? (
          <Card>
            <CardDescription>Sem motoristas ainda.</CardDescription>
          </Card>
        ) : (
          <div className="space-y-2">
            {drivers.map((driver) => (
              <Link key={driver.id} href={`/admin/drivers/${driver.id}`} className="block">
                <Card className="flex flex-row flex-wrap items-center justify-between gap-3 hover:border-brand-yellow/50">
                  <div>
                    <CardTitle>{driver.profile?.full_name ?? "—"}</CardTitle>
                    <CardDescription>
                      {driver.profile?.email} · {driver.vehicles.map((v) => VEHICLE_CATEGORIES[v.category].label).join(", ") || "sem veículo"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={driver.status === "approved" ? "success" : "danger"}>{driver.status}</Badge>
                    <Badge>{driver.availability_status}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
