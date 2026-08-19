import { getRepository } from "@/lib/db";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function AdminCustomersPage() {
  const repo = getRepository();
  const customers = await repo.listCustomers();
  const ordersByCustomer = await Promise.all(customers.map((c) => repo.listOrdersByCustomer(c.id)));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Clientes</h1>
      {customers.length === 0 ? (
        <Card>
          <CardDescription>Sem clientes registados.</CardDescription>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((customer, i) => (
            <Card key={customer.id} className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{customer.full_name}</CardTitle>
                <CardDescription>
                  {customer.email} {customer.phone ? `· ${customer.phone}` : ""}
                </CardDescription>
              </div>
              <span className="text-sm text-muted-foreground">{ordersByCustomer[i].length} pedido(s)</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
