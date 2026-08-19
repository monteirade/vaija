/* eslint-disable @typescript-eslint/no-explicit-any -- linhas devolvidas por
   better-sqlite3 (.get()/.all()) não são tipadas; os mapXxx() abaixo são o
   único local onde o `any` da linha crua é convertido para os tipos de
   domínio, o que justifica o uso aqui. */
import { randomUUID } from "node:crypto";
import { getDemoDb } from "./connection";
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

function now(): string {
  return new Date().toISOString();
}

// ---- mappers (SQLite row -> tipo de domínio) ----

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    role: row.role,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapDriverProfile(row: any): DriverProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    service_area: row.service_area,
    availability_status: row.availability_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVehicle(row: any): Vehicle {
  return {
    id: row.id,
    driver_id: row.driver_id,
    category: row.category,
    make: row.make,
    model: row.model,
    registration: row.registration,
    capacity_kg: row.capacity_kg,
    created_at: row.created_at,
  };
}

function mapDriverApplication(row: any): DriverApplication {
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    vehicle_category: row.vehicle_category,
    vehicle_make: row.vehicle_make,
    vehicle_model: row.vehicle_model,
    vehicle_registration: row.vehicle_registration,
    vehicle_capacity_kg: row.vehicle_capacity_kg,
    service_area: row.service_area,
    availability: row.availability,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    public_order_number: row.public_order_number,
    customer_id: row.customer_id,
    driver_id: row.driver_id,
    service_type: row.service_type,
    timing_type: row.timing_type,
    scheduled_at: row.scheduled_at,
    pickup_address: row.pickup_address,
    pickup_lat: row.pickup_lat,
    pickup_lng: row.pickup_lng,
    destination_address: row.destination_address,
    destination_lat: row.destination_lat,
    destination_lng: row.destination_lng,
    distance_km: row.distance_km,
    cargo_description: row.cargo_description,
    cargo_weight_kg: row.cargo_weight_kg,
    package_count: row.package_count,
    vehicle_category: row.vehicle_category,
    needs_helpers: !!row.needs_helpers,
    helpers_count: row.helpers_count,
    helper_hours: row.helper_hours,
    passenger: !!row.passenger,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    base_price: row.base_price,
    distance_price: row.distance_price,
    helper_price: row.helper_price,
    tolls: row.tolls,
    total_price: row.total_price,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapOrderPhoto(row: any): OrderPhoto {
  return { id: row.id, order_id: row.order_id, storage_path: row.storage_path, created_at: row.created_at };
}

function mapHistory(row: any): OrderStatusHistoryEntry {
  return { id: row.id, order_id: row.order_id, status: row.status, changed_by: row.changed_by, created_at: row.created_at };
}

function mapLocation(row: any): DriverLocation {
  return { id: row.id, driver_id: row.driver_id, lat: row.lat, lng: row.lng, accuracy: row.accuracy, recorded_at: row.recorded_at };
}

function mapChangeRequest(row: any): ChangeRequest {
  return {
    id: row.id,
    customer_id: row.customer_id,
    pickup_address: row.pickup_address,
    destination_address: row.destination_address,
    scheduled_at: row.scheduled_at,
    description: row.description,
    helpers_count: row.helpers_count,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapChangeRequestPhoto(row: any): ChangeRequestPhoto {
  return { id: row.id, change_request_id: row.change_request_id, storage_path: row.storage_path, created_at: row.created_at };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

export class DemoRepository implements DataRepository {
  private db = getDemoDb();

  // ---- profiles ----
  async getProfileById(id: string): Promise<Profile | null> {
    const row = this.db.prepare("select * from profiles where id = ?").get(id);
    return row ? mapProfile(row) : null;
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const row = this.db.prepare("select * from profiles where email = ?").get(email.toLowerCase());
    return row ? mapProfile(row) : null;
  }

  async createProfile(input: CreateProfileInput): Promise<Profile> {
    const ts = now();
    this.db
      .prepare(
        `insert into profiles (id, role, full_name, email, phone, password_hash, created_at, updated_at)
         values (@id, @role, @full_name, @email, @phone, @password_hash, @created_at, @updated_at)`
      )
      .run({
        id: input.id,
        role: input.role,
        full_name: input.full_name,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        password_hash: input.password_hash ?? "",
        created_at: ts,
        updated_at: ts,
      });
    return (await this.getProfileById(input.id))!;
  }

  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfileById(id);
    if (!current) throw new Error("Perfil não encontrado");
    const merged = { ...current, ...patch, updated_at: now() };
    this.db
      .prepare(
        `update profiles set role=@role, full_name=@full_name, email=@email, phone=@phone, updated_at=@updated_at where id=@id`
      )
      .run(merged);
    return (await this.getProfileById(id))!;
  }

  async listCustomers(): Promise<Profile[]> {
    const rows = this.db.prepare("select * from profiles where role = 'customer' order by created_at desc").all();
    return rows.map(mapProfile);
  }

  // ---- driver profiles ----
  async getDriverProfileByUserId(userId: string): Promise<DriverProfile | null> {
    const row = this.db.prepare("select * from driver_profiles where user_id = ?").get(userId);
    return row ? mapDriverProfile(row) : null;
  }

  async getDriverProfileById(id: string): Promise<DriverProfile | null> {
    const row = this.db.prepare("select * from driver_profiles where id = ?").get(id);
    return row ? mapDriverProfile(row) : null;
  }

  async createDriverProfile(userId: string, serviceArea?: string | null): Promise<DriverProfile> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `insert into driver_profiles (id, user_id, status, service_area, availability_status, created_at, updated_at)
         values (?, ?, 'pending', ?, 'offline', ?, ?)`
      )
      .run(id, userId, serviceArea ?? null, ts, ts);
    return (await this.getDriverProfileById(id))!;
  }

  async updateDriverProfile(id: string, patch: Partial<DriverProfile>): Promise<DriverProfile> {
    const current = await this.getDriverProfileById(id);
    if (!current) throw new Error("Motorista não encontrado");
    const merged = { ...current, ...patch, updated_at: now() };
    this.db
      .prepare(
        `update driver_profiles set status=@status, service_area=@service_area, availability_status=@availability_status, updated_at=@updated_at where id=@id`
      )
      .run(merged);
    return (await this.getDriverProfileById(id))!;
  }

  async listDrivers(): Promise<(DriverProfile & { profile: Profile | null; vehicles: Vehicle[] })[]> {
    const rows = this.db.prepare("select * from driver_profiles order by created_at desc").all();
    const result = [];
    for (const row of rows) {
      const dp = mapDriverProfile(row);
      const profile = await this.getProfileById(dp.user_id);
      const vehicles = await this.listVehiclesByDriver(dp.id);
      result.push({ ...dp, profile, vehicles });
    }
    return result;
  }

  // ---- vehicles ----
  async createVehicle(driverId: string, vehicle: Omit<Vehicle, "id" | "driver_id" | "created_at">): Promise<Vehicle> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `insert into vehicles (id, driver_id, category, make, model, registration, capacity_kg, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, driverId, vehicle.category, vehicle.make, vehicle.model, vehicle.registration, vehicle.capacity_kg, ts);
    const row = this.db.prepare("select * from vehicles where id = ?").get(id);
    return mapVehicle(row);
  }

  async listVehiclesByDriver(driverId: string): Promise<Vehicle[]> {
    const rows = this.db.prepare("select * from vehicles where driver_id = ? order by created_at desc").all(driverId);
    return rows.map(mapVehicle);
  }

  // ---- driver applications ----
  async createDriverApplication(input: CreateDriverApplicationInput): Promise<DriverApplication> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `insert into driver_applications
          (id, user_id, full_name, email, phone, vehicle_category, vehicle_make, vehicle_model, vehicle_registration, vehicle_capacity_kg, service_area, availability, status, notes, created_at)
         values (@id, @user_id, @full_name, @email, @phone, @vehicle_category, @vehicle_make, @vehicle_model, @vehicle_registration, @vehicle_capacity_kg, @service_area, @availability, 'pending', null, @created_at)`
      )
      .run({ id, created_at: ts, user_id: input.user_id ?? null, ...input });
    const row = this.db.prepare("select * from driver_applications where id = ?").get(id);
    return mapDriverApplication(row);
  }

  async listDriverApplications(): Promise<DriverApplication[]> {
    const rows = this.db.prepare("select * from driver_applications order by created_at desc").all();
    return rows.map(mapDriverApplication);
  }

  async getDriverApplicationById(id: string): Promise<DriverApplication | null> {
    const row = this.db.prepare("select * from driver_applications where id = ?").get(id);
    return row ? mapDriverApplication(row) : null;
  }

  async updateDriverApplicationStatus(id: string, status: DriverApplicationStatus, notes?: string | null): Promise<DriverApplication> {
    this.db.prepare("update driver_applications set status = ?, notes = ? where id = ?").run(status, notes ?? null, id);
    return (await this.getDriverApplicationById(id))!;
  }

  // ---- orders ----
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const id = randomUUID();
    const ts = now();
    const publicNumber = generatePublicOrderNumber();
    this.db
      .prepare(
        `insert into orders (
          id, public_order_number, customer_id, driver_id, service_type, timing_type, scheduled_at,
          pickup_address, pickup_lat, pickup_lng, destination_address, destination_lat, destination_lng,
          distance_km, cargo_description, cargo_weight_kg, package_count, vehicle_category,
          needs_helpers, helpers_count, helper_hours, passenger, payment_method, payment_status,
          base_price, distance_price, helper_price, tolls, total_price, status, notes, created_at, updated_at
        ) values (
          @id, @public_order_number, @customer_id, null, @service_type, @timing_type, @scheduled_at,
          @pickup_address, @pickup_lat, @pickup_lng, @destination_address, @destination_lat, @destination_lng,
          @distance_km, @cargo_description, @cargo_weight_kg, @package_count, @vehicle_category,
          @needs_helpers, @helpers_count, @helper_hours, @passenger, @payment_method, @payment_status,
          @base_price, @distance_price, @helper_price, @tolls, @total_price, 'PENDING', @notes, @created_at, @updated_at
        )`
      )
      .run({
        id,
        public_order_number: publicNumber,
        customer_id: input.customer_id,
        service_type: input.service_type,
        timing_type: input.timing_type,
        scheduled_at: input.scheduled_at ?? null,
        pickup_address: input.pickup_address,
        pickup_lat: input.pickup_lat ?? null,
        pickup_lng: input.pickup_lng ?? null,
        destination_address: input.destination_address,
        destination_lat: input.destination_lat ?? null,
        destination_lng: input.destination_lng ?? null,
        distance_km: input.distance_km ?? null,
        cargo_description: input.cargo_description ?? null,
        cargo_weight_kg: input.cargo_weight_kg ?? null,
        package_count: input.package_count ?? null,
        vehicle_category: input.vehicle_category,
        needs_helpers: input.needs_helpers ? 1 : 0,
        helpers_count: input.helpers_count,
        helper_hours: input.helper_hours,
        passenger: input.passenger ? 1 : 0,
        payment_method: input.payment_method,
        payment_status: input.payment_status,
        base_price: input.base_price,
        distance_price: input.distance_price,
        helper_price: input.helper_price,
        tolls: input.tolls,
        total_price: input.total_price,
        notes: input.notes ?? null,
        created_at: ts,
        updated_at: ts,
      });

    this.db
      .prepare("insert into order_status_history (id, order_id, status, changed_by, created_at) values (?, ?, 'PENDING', ?, ?)")
      .run(randomUUID(), id, input.customer_id, ts);

    // Transição automática para SEARCHING_DRIVER (o pedido fica logo visível a motoristas).
    await this.updateOrderStatus(id, "SEARCHING_DRIVER", input.customer_id);

    return (await this.getOrderById(id))!;
  }

  async getOrderById(id: string): Promise<Order | null> {
    const row = this.db.prepare("select * from orders where id = ?").get(id);
    return row ? mapOrder(row) : null;
  }

  async listOrdersByCustomer(customerId: string): Promise<Order[]> {
    const rows = this.db.prepare("select * from orders where customer_id = ? order by created_at desc").all(customerId);
    return rows.map(mapOrder);
  }

  async listOrdersByDriver(driverProfileId: string): Promise<Order[]> {
    const rows = this.db.prepare("select * from orders where driver_id = ? order by created_at desc").all(driverProfileId);
    return rows.map(mapOrder);
  }

  async listAvailableOrdersForDriver(vehicleCategory?: Vehicle["category"]): Promise<Order[]> {
    const rows = vehicleCategory
      ? this.db
          .prepare("select * from orders where status = 'SEARCHING_DRIVER' and driver_id is null and vehicle_category = ? order by created_at asc")
          .all(vehicleCategory)
      : this.db
          .prepare("select * from orders where status = 'SEARCHING_DRIVER' and driver_id is null order by created_at asc")
          .all();
    return rows.map(mapOrder);
  }

  async listAllOrders(): Promise<Order[]> {
    const rows = this.db.prepare("select * from orders order by created_at desc").all();
    return rows.map(mapOrder);
  }

  async assignDriverToOrder(orderId: string, driverProfileId: string, changedBy: string): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error("Pedido não encontrado");
    this.db.prepare("update orders set driver_id = ?, updated_at = ? where id = ?").run(driverProfileId, now(), orderId);
    return this.updateOrderStatus(orderId, "DRIVER_ASSIGNED", changedBy);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, changedBy: string): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status !== status) {
      assertValidTransition(order.status, status);
    }
    this.db.prepare("update orders set status = ?, updated_at = ? where id = ?").run(status, now(), orderId);
    this.db
      .prepare("insert into order_status_history (id, order_id, status, changed_by, created_at) values (?, ?, ?, ?, ?)")
      .run(randomUUID(), orderId, status, changedBy, now());
    return (await this.getOrderById(orderId))!;
  }

  async updateOrder(orderId: string, patch: Partial<Order>): Promise<Order> {
    const current = await this.getOrderById(orderId);
    if (!current) throw new Error("Pedido não encontrado");
    const merged: any = { ...current, ...patch, updated_at: now() };
    this.db
      .prepare(
        `update orders set
          cargo_description=@cargo_description, cargo_weight_kg=@cargo_weight_kg, package_count=@package_count,
          notes=@notes, payment_status=@payment_status, updated_at=@updated_at
         where id=@id`
      )
      .run({ ...merged, id: orderId });
    return (await this.getOrderById(orderId))!;
  }

  // ---- order photos ----
  async addOrderPhoto(orderId: string, storagePath: string): Promise<OrderPhoto> {
    const id = randomUUID();
    const ts = now();
    this.db.prepare("insert into order_photos (id, order_id, storage_path, created_at) values (?, ?, ?, ?)").run(id, orderId, storagePath, ts);
    const row = this.db.prepare("select * from order_photos where id = ?").get(id);
    return mapOrderPhoto(row);
  }

  async listOrderPhotos(orderId: string): Promise<OrderPhoto[]> {
    const rows = this.db.prepare("select * from order_photos where order_id = ? order by created_at asc").all(orderId);
    return rows.map(mapOrderPhoto);
  }

  // ---- order status history ----
  async listOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const rows = this.db.prepare("select * from order_status_history where order_id = ? order by created_at asc").all(orderId);
    return rows.map(mapHistory);
  }

  // ---- driver locations ----
  async recordDriverLocation(driverId: string, lat: number, lng: number, accuracy?: number | null): Promise<DriverLocation> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare("insert into driver_locations (id, driver_id, lat, lng, accuracy, recorded_at) values (?, ?, ?, ?, ?, ?)")
      .run(id, driverId, lat, lng, accuracy ?? null, ts);
    const row = this.db.prepare("select * from driver_locations where id = ?").get(id);
    return mapLocation(row);
  }

  async getLatestDriverLocation(driverId: string): Promise<DriverLocation | null> {
    const row = this.db
      .prepare("select * from driver_locations where driver_id = ? order by recorded_at desc limit 1")
      .get(driverId);
    return row ? mapLocation(row) : null;
  }

  // ---- change requests ----
  async createChangeRequest(input: CreateChangeRequestInput): Promise<ChangeRequest> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare(
        `insert into change_requests (id, customer_id, pickup_address, destination_address, scheduled_at, description, helpers_count, status, notes, created_at, updated_at)
         values (@id, @customer_id, @pickup_address, @destination_address, @scheduled_at, @description, @helpers_count, 'pending_review', null, @created_at, @updated_at)`
      )
      .run({
        id,
        customer_id: input.customer_id,
        pickup_address: input.pickup_address,
        destination_address: input.destination_address,
        scheduled_at: input.scheduled_at ?? null,
        description: input.description ?? null,
        helpers_count: input.helpers_count,
        created_at: ts,
        updated_at: ts,
      });
    return (await this.getChangeRequestById(id))!;
  }

  async listChangeRequests(): Promise<ChangeRequest[]> {
    const rows = this.db.prepare("select * from change_requests order by created_at desc").all();
    return rows.map(mapChangeRequest);
  }

  async listChangeRequestsByCustomer(customerId: string): Promise<ChangeRequest[]> {
    const rows = this.db.prepare("select * from change_requests where customer_id = ? order by created_at desc").all(customerId);
    return rows.map(mapChangeRequest);
  }

  async getChangeRequestById(id: string): Promise<ChangeRequest | null> {
    const row = this.db.prepare("select * from change_requests where id = ?").get(id);
    return row ? mapChangeRequest(row) : null;
  }

  async updateChangeRequestStatus(id: string, status: ChangeRequestStatus, notes?: string | null): Promise<ChangeRequest> {
    this.db
      .prepare("update change_requests set status = ?, notes = coalesce(?, notes), updated_at = ? where id = ?")
      .run(status, notes ?? null, now(), id);
    return (await this.getChangeRequestById(id))!;
  }

  async addChangeRequestPhoto(changeRequestId: string, storagePath: string): Promise<ChangeRequestPhoto> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare("insert into change_request_photos (id, change_request_id, storage_path, created_at) values (?, ?, ?, ?)")
      .run(id, changeRequestId, storagePath, ts);
    const row = this.db.prepare("select * from change_request_photos where id = ?").get(id);
    return mapChangeRequestPhoto(row);
  }

  async listChangeRequestPhotos(changeRequestId: string): Promise<ChangeRequestPhoto[]> {
    const rows = this.db
      .prepare("select * from change_request_photos where change_request_id = ? order by created_at asc")
      .all(changeRequestId);
    return rows.map(mapChangeRequestPhoto);
  }

  // ---- notifications ----
  async createNotification(userId: string, type: Notification["type"], title: string, body?: string | null): Promise<Notification> {
    const id = randomUUID();
    const ts = now();
    this.db
      .prepare("insert into notifications (id, user_id, type, title, body, read_at, created_at) values (?, ?, ?, ?, ?, null, ?)")
      .run(id, userId, type, title, body ?? null, ts);
    const row = this.db.prepare("select * from notifications where id = ?").get(id);
    return mapNotification(row);
  }

  async listNotificationsForUser(userId: string): Promise<Notification[]> {
    const rows = this.db.prepare("select * from notifications where user_id = ? order by created_at desc limit 50").all(userId);
    return rows.map(mapNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    this.db.prepare("update notifications set read_at = ? where id = ?").run(now(), id);
  }

  // ---- auxiliar apenas para o módulo de autenticação demo ----
  getPasswordHashByEmail(email: string): string | null {
    const row: any = this.db.prepare("select password_hash from profiles where email = ?").get(email.toLowerCase());
    return row ? row.password_hash : null;
  }
}
