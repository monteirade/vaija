import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getRepository } from "@/lib/db";
import { canAccessOrder } from "@/lib/orders/access";
import { SiteHeader } from "@/components/site-header";
import { OrderTracker } from "./order-tracker";

export default async function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const repo = getRepository();
  const order = await repo.getOrderById(id);
  if (!order) notFound();
  if (!(await canAccessOrder(user, order))) notFound();

  const [history, driverProfile] = await Promise.all([
    repo.listOrderStatusHistory(order.id),
    order.driver_id ? repo.getDriverProfileById(order.driver_id) : Promise.resolve(null),
  ]);
  const driverUserProfile = driverProfile ? await repo.getProfileById(driverProfile.user_id) : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <OrderTracker
          orderId={order.id}
          initialOrder={order}
          initialHistory={history}
          initialDriver={driverUserProfile ? { full_name: driverUserProfile.full_name, phone: driverUserProfile.phone } : null}
          canCancel={order.customer_id === user.profile.id}
        />
      </main>
    </>
  );
}
