// Adaptador Supabase (produção). Implementa a mesma interface DataRepository
// usada pelo adaptador demo (lib/db/demo/store.ts), para que a troca entre
// modo demo e Supabase real seja apenas uma questão de configurar
// NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (ver lib/db/index.ts).
//
// NOTA: esta implementação usa o service-role client (contorna RLS). Isto é
// aceitável para um protótipo com validação de autorização feita também na
// aplicação, mas antes de produção considerar mover para clientes
// autenticados por utilizador (ver docs/ARCHITECTURE.md) para que a RLS do
// Postgres seja a linha de defesa principal, como pede a secção 6 da
// especificação.

/* eslint-disable @typescript-eslint/no-explicit-any -- o SDK do supabase-js
   devolve `PostgrestError` e payloads dinâmicos por tabela; sem tipos
   gerados a partir do schema (supabase gen types) o `any` pontual aqui é
   inevitável e está isolado a este ficheiro de adaptador. */
import { getSupabaseServiceClient } from "./client";
import { generatePublicOrderNumber } from "../repository";
import type {
  DataRepository,
  CreateProfileInput,
  CreateOrderInput,
  CreateDriverApplicationInput,
  CreateChangeRequestInput,
} from "../repository";
import type {
  ChangeRequest,
  ChangeRequestPhoto,
  ChangeRequestStatus,
  DriverApplication,
  DriverApplicationStatus,
  DriverLocation,
  DriverProfile,
  Notification,
  Order,
  OrderPhoto,
  OrderStatus,
  OrderStatusHistoryEntry,
  Profile,
  Vehicle,
} from "@/types/domain";
import { assertValidTransition } from "@/lib/orders/state-machine";

function unwrap<T>(result: { data: T | null; error: any }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export class SupabaseRepository implements DataRepository {
  private db = getSupabaseServiceClient();

  async getProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Profile | null;
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await this.db.from("profiles").select("*").eq("email", email.toLowerCase()).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Profile | null;
  }

  async createProfile(input: CreateProfileInput): Promise<Profile> {
    const result = await this.db
      .from("profiles")
      .insert({ id: input.id, role: input.role, full_name: input.full_name, email: input.email.toLowerCase(), phone: input.phone ?? null })
      .select("*")
      .single();
    return unwrap(result);
  }

  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    const result = await this.db.from("profiles").update(patch).eq("id", id).select("*").single();
    return unwrap(result);
  }

  async listCustomers(): Promise<Profile[]> {
    const result = await this.db.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async getDriverProfileByUserId(userId: string): Promise<DriverProfile | null> {
    const { data, error } = await this.db.from("driver_profiles").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data as DriverProfile | null;
  }

  async getDriverProfileById(id: string): Promise<DriverProfile | null> {
    const { data, error } = await this.db.from("driver_profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as DriverProfile | null;
  }

  async createDriverProfile(userId: string, serviceArea?: string | null): Promise<DriverProfile> {
    const result = await this.db
      .from("driver_profiles")
      .insert({ user_id: userId, service_area: serviceArea ?? null, status: "pending", availability_status: "offline" })
      .select("*")
      .single();
    return unwrap(result);
  }

  async updateDriverProfile(id: string, patch: Partial<DriverProfile>): Promise<DriverProfile> {
    const result = await this.db.from("driver_profiles").update(patch).eq("id", id).select("*").single();
    return unwrap(result);
  }

  async listDrivers(): Promise<(DriverProfile & { profile: Profile | null; vehicles: Vehicle[] })[]> {
    const result = await this.db.from("driver_profiles").select("*").order("created_at", { ascending: false });
    const rows = (unwrap(result) ?? []) as DriverProfile[];
    const out = [];
    for (const dp of rows) {
      const profile = await this.getProfileById(dp.user_id);
      const vehicles = await this.listVehiclesByDriver(dp.id);
      out.push({ ...dp, profile, vehicles });
    }
    return out;
  }

  async createVehicle(driverId: string, vehicle: Omit<Vehicle, "id" | "driver_id" | "created_at">): Promise<Vehicle> {
    const result = await this.db.from("vehicles").insert({ driver_id: driverId, ...vehicle }).select("*").single();
    return unwrap(result);
  }

  async listVehiclesByDriver(driverId: string): Promise<Vehicle[]> {
    const result = await this.db.from("vehicles").select("*").eq("driver_id", driverId).order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async createDriverApplication(input: CreateDriverApplicationInput): Promise<DriverApplication> {
    const result = await this.db.from("driver_applications").insert({ ...input, status: "pending" }).select("*").single();
    return unwrap(result);
  }

  async listDriverApplications(): Promise<DriverApplication[]> {
    const result = await this.db.from("driver_applications").select("*").order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async getDriverApplicationById(id: string): Promise<DriverApplication | null> {
    const { data, error } = await this.db.from("driver_applications").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as DriverApplication | null;
  }

  async updateDriverApplicationStatus(id: string, status: DriverApplicationStatus, notes?: string | null): Promise<DriverApplication> {
    const result = await this.db.from("driver_applications").update({ status, notes: notes ?? null }).eq("id", id).select("*").single();
    return unwrap(result);
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const publicNumber = generatePublicOrderNumber();
    const result = await this.db
      .from("orders")
      .insert({ ...input, public_order_number: publicNumber, status: "PENDING" })
      .select("*")
      .single();
    const order = unwrap<Order>(result);
    await this.db.from("order_status_history").insert({ order_id: order.id, status: "PENDING", changed_by: input.customer_id });
    return this.updateOrderStatus(order.id, "SEARCHING_DRIVER", input.customer_id);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await this.db.from("orders").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Order | null;
  }

  async listOrdersByCustomer(customerId: string): Promise<Order[]> {
    const result = await this.db.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async listOrdersByDriver(driverProfileId: string): Promise<Order[]> {
    const result = await this.db.from("orders").select("*").eq("driver_id", driverProfileId).order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async listAvailableOrdersForDriver(vehicleCategory?: Vehicle["category"]): Promise<Order[]> {
    let query = this.db.from("orders").select("*").eq("status", "SEARCHING_DRIVER").is("driver_id", null);
    if (vehicleCategory) query = query.eq("vehicle_category", vehicleCategory);
    const result = await query.order("created_at", { ascending: true });
    return unwrap(result) ?? [];
  }

  async listAllOrders(): Promise<Order[]> {
    const result = await this.db.from("orders").select("*").order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async assignDriverToOrder(orderId: string, driverProfileId: string, changedBy: string): Promise<Order> {
    const { error } = await this.db.from("orders").update({ driver_id: driverProfileId }).eq("id", orderId);
    if (error) throw new Error(error.message);
    return this.updateOrderStatus(orderId, "DRIVER_ASSIGNED", changedBy);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, changedBy: string): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status !== status) assertValidTransition(order.status, status);
    const { error } = await this.db.from("orders").update({ status }).eq("id", orderId);
    if (error) throw new Error(error.message);
    await this.db.from("order_status_history").insert({ order_id: orderId, status, changed_by: changedBy });
    return (await this.getOrderById(orderId))!;
  }

  async updateOrder(orderId: string, patch: Partial<Order>): Promise<Order> {
    const result = await this.db.from("orders").update(patch).eq("id", orderId).select("*").single();
    return unwrap(result);
  }

  async addOrderPhoto(orderId: string, storagePath: string): Promise<OrderPhoto> {
    const result = await this.db.from("order_photos").insert({ order_id: orderId, storage_path: storagePath }).select("*").single();
    return unwrap(result);
  }

  async listOrderPhotos(orderId: string): Promise<OrderPhoto[]> {
    const result = await this.db.from("order_photos").select("*").eq("order_id", orderId).order("created_at", { ascending: true });
    return unwrap(result) ?? [];
  }

  async listOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const result = await this.db
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    return unwrap(result) ?? [];
  }

  async recordDriverLocation(driverId: string, lat: number, lng: number, accuracy?: number | null): Promise<DriverLocation> {
    const result = await this.db
      .from("driver_locations")
      .insert({ driver_id: driverId, lat, lng, accuracy: accuracy ?? null })
      .select("*")
      .single();
    return unwrap(result);
  }

  async getLatestDriverLocation(driverId: string): Promise<DriverLocation | null> {
    const { data, error } = await this.db
      .from("driver_locations")
      .select("*")
      .eq("driver_id", driverId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as DriverLocation | null;
  }

  async createChangeRequest(input: CreateChangeRequestInput): Promise<ChangeRequest> {
    const result = await this.db.from("change_requests").insert({ ...input, status: "pending_review" }).select("*").single();
    return unwrap(result);
  }

  async listChangeRequests(): Promise<ChangeRequest[]> {
    const result = await this.db.from("change_requests").select("*").order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async listChangeRequestsByCustomer(customerId: string): Promise<ChangeRequest[]> {
    const result = await this.db
      .from("change_requests")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    return unwrap(result) ?? [];
  }

  async getChangeRequestById(id: string): Promise<ChangeRequest | null> {
    const { data, error } = await this.db.from("change_requests").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as ChangeRequest | null;
  }

  async updateChangeRequestStatus(id: string, status: ChangeRequestStatus, notes?: string | null): Promise<ChangeRequest> {
    const patch: any = { status };
    if (notes !== undefined) patch.notes = notes;
    const result = await this.db.from("change_requests").update(patch).eq("id", id).select("*").single();
    return unwrap(result);
  }

  async addChangeRequestPhoto(changeRequestId: string, storagePath: string): Promise<ChangeRequestPhoto> {
    const result = await this.db
      .from("change_request_photos")
      .insert({ change_request_id: changeRequestId, storage_path: storagePath })
      .select("*")
      .single();
    return unwrap(result);
  }

  async listChangeRequestPhotos(changeRequestId: string): Promise<ChangeRequestPhoto[]> {
    const result = await this.db
      .from("change_request_photos")
      .select("*")
      .eq("change_request_id", changeRequestId)
      .order("created_at", { ascending: true });
    return unwrap(result) ?? [];
  }

  async createNotification(userId: string, type: Notification["type"], title: string, body?: string | null): Promise<Notification> {
    const result = await this.db
      .from("notifications")
      .insert({ user_id: userId, type, title, body: body ?? null })
      .select("*")
      .single();
    return unwrap(result);
  }

  async listNotificationsForUser(userId: string): Promise<Notification[]> {
    const result = await this.db
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return unwrap(result) ?? [];
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  }
}
