// Interface de acesso a dados (Repository/Adapter pattern).
//
// TODA a aplicação fala com esta interface — nunca diretamente com SQLite
// ou com o cliente Supabase. Isto permite trocar o adaptador demo (SQLite
// local, sem credenciais) por um adaptador Supabase real (Postgres + RLS)
// sem tocar no resto do código. Ver lib/db/index.ts para a seleção do
// adaptador e lib/db/demo/store.ts / lib/db/supabase/store.ts para as
// implementações concretas.

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
  Role,
  Vehicle,
} from "@/types/domain";

export interface CreateProfileInput {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  phone?: string | null;
  // Usado apenas pelo adaptador demo (ver lib/db/demo/store.ts) para
  // guardar a password localmente. Ignorado pelo adaptador Supabase, onde
  // a autenticação é feita por supabase.auth.
  password_hash?: string;
}

export interface CreateOrderInput {
  customer_id: string;
  service_type: Order["service_type"];
  timing_type: Order["timing_type"];
  scheduled_at?: string | null;
  pickup_address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  destination_address: string;
  destination_lat?: number | null;
  destination_lng?: number | null;
  distance_km?: number | null;
  cargo_description?: string | null;
  cargo_weight_kg?: number | null;
  package_count?: number | null;
  vehicle_category: Order["vehicle_category"];
  needs_helpers: boolean;
  helpers_count: number;
  helper_hours: number;
  passenger: boolean;
  payment_method: Order["payment_method"];
  payment_status: Order["payment_status"];
  base_price: number;
  distance_price: number;
  helper_price: number;
  tolls: number;
  total_price: number;
  notes?: string | null;
}

export interface CreateDriverApplicationInput {
  user_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  vehicle_category: Vehicle["category"];
  vehicle_make: string;
  vehicle_model: string;
  vehicle_registration: string;
  vehicle_capacity_kg: number;
  service_area: string;
  availability: string;
}

export interface CreateChangeRequestInput {
  customer_id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_at?: string | null;
  description?: string | null;
  helpers_count: number;
}

export interface DataRepository {
  // ---- profiles ----
  getProfileById(id: string): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  createProfile(input: CreateProfileInput): Promise<Profile>;
  updateProfile(id: string, patch: Partial<Profile>): Promise<Profile>;
  listCustomers(): Promise<Profile[]>;

  // ---- driver profiles ----
  getDriverProfileByUserId(userId: string): Promise<DriverProfile | null>;
  getDriverProfileById(id: string): Promise<DriverProfile | null>;
  createDriverProfile(userId: string, serviceArea?: string | null): Promise<DriverProfile>;
  updateDriverProfile(id: string, patch: Partial<DriverProfile>): Promise<DriverProfile>;
  listDrivers(): Promise<(DriverProfile & { profile: Profile | null; vehicles: Vehicle[] })[]>;

  // ---- vehicles ----
  createVehicle(driverId: string, vehicle: Omit<Vehicle, "id" | "driver_id" | "created_at">): Promise<Vehicle>;
  listVehiclesByDriver(driverId: string): Promise<Vehicle[]>;

  // ---- driver applications ----
  createDriverApplication(input: CreateDriverApplicationInput): Promise<DriverApplication>;
  listDriverApplications(): Promise<DriverApplication[]>;
  getDriverApplicationById(id: string): Promise<DriverApplication | null>;
  updateDriverApplicationStatus(
    id: string,
    status: DriverApplicationStatus,
    notes?: string | null
  ): Promise<DriverApplication>;

  // ---- orders ----
  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  listOrdersByCustomer(customerId: string): Promise<Order[]>;
  listOrdersByDriver(driverProfileId: string): Promise<Order[]>;
  listAvailableOrdersForDriver(vehicleCategory?: Vehicle["category"]): Promise<Order[]>;
  listAllOrders(): Promise<Order[]>;
  assignDriverToOrder(orderId: string, driverProfileId: string, changedBy: string): Promise<Order>;
  updateOrderStatus(orderId: string, status: OrderStatus, changedBy: string): Promise<Order>;
  updateOrder(orderId: string, patch: Partial<Order>): Promise<Order>;

  // ---- order photos ----
  addOrderPhoto(orderId: string, storagePath: string): Promise<OrderPhoto>;
  listOrderPhotos(orderId: string): Promise<OrderPhoto[]>;

  // ---- order status history ----
  listOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]>;

  // ---- driver locations ----
  recordDriverLocation(driverId: string, lat: number, lng: number, accuracy?: number | null): Promise<DriverLocation>;
  getLatestDriverLocation(driverId: string): Promise<DriverLocation | null>;

  // ---- change requests ----
  createChangeRequest(input: CreateChangeRequestInput): Promise<ChangeRequest>;
  listChangeRequests(): Promise<ChangeRequest[]>;
  listChangeRequestsByCustomer(customerId: string): Promise<ChangeRequest[]>;
  getChangeRequestById(id: string): Promise<ChangeRequest | null>;
  updateChangeRequestStatus(id: string, status: ChangeRequestStatus, notes?: string | null): Promise<ChangeRequest>;
  addChangeRequestPhoto(changeRequestId: string, storagePath: string): Promise<ChangeRequestPhoto>;
  listChangeRequestPhotos(changeRequestId: string): Promise<ChangeRequestPhoto[]>;

  // ---- notifications ----
  createNotification(
    userId: string,
    type: Notification["type"],
    title: string,
    body?: string | null
  ): Promise<Notification>;
  listNotificationsForUser(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
}

export function generatePublicOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VJ-${year}-${rand}`;
}
