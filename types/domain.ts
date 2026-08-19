// Tipos de domínio centrais da Vai Já.
// Espelham o schema Supabase definido em supabase/migrations/0001_init.sql
// Qualquer alteração ao modelo de dados deve ser refletida em ambos os locais.

export type Role = "customer" | "driver" | "admin";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type DriverApprovalStatus = "pending" | "approved" | "suspended";
export type DriverAvailability = "offline" | "available" | "busy";

export interface DriverProfile {
  id: string;
  user_id: string;
  status: DriverApprovalStatus;
  service_area: string | null;
  availability_status: DriverAvailability;
  created_at: string;
  updated_at: string;
}

export type VehicleCategory = "van" | "small_truck" | "large_truck";

export interface Vehicle {
  id: string;
  driver_id: string;
  category: VehicleCategory;
  make: string;
  model: string;
  registration: string;
  capacity_kg: number;
  created_at: string;
}

export type DriverApplicationStatus = "pending" | "approved" | "rejected";

export interface DriverApplication {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  vehicle_category: VehicleCategory;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_registration: string;
  vehicle_capacity_kg: number;
  service_area: string;
  availability: string;
  status: DriverApplicationStatus;
  notes: string | null;
  created_at: string;
}

export type ServiceType =
  | "materials"
  | "debris"
  | "team_with_tools"
  | "moving"
  | "other";

export type TimingType = "now" | "scheduled";

export type PaymentMethod = "card" | "mbway" | "cash";
export type PaymentStatus = "PENDING" | "DEMO_PAID" | "PAY_ON_DELIVERY";

export type OrderStatus =
  | "PENDING"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ARRIVING"
  | "DRIVER_ARRIVED"
  | "CARGO_LOADING"
  | "CARGO_LOADED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  id: string;
  public_order_number: string;
  customer_id: string;
  driver_id: string | null;
  service_type: ServiceType;
  timing_type: TimingType;
  scheduled_at: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  distance_km: number | null;
  cargo_description: string | null;
  cargo_weight_kg: number | null;
  package_count: number | null;
  vehicle_category: VehicleCategory;
  needs_helpers: boolean;
  helpers_count: number;
  helper_hours: number;
  passenger: boolean;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  base_price: number;
  distance_price: number;
  helper_price: number;
  tolls: number;
  total_price: number;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderPhoto {
  id: string;
  order_id: string;
  storage_path: string;
  created_at: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  created_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
}

export type ChangeRequestStatus =
  | "pending_review"
  | "contacted"
  | "quoted"
  | "confirmed"
  | "cancelled";

export interface ChangeRequest {
  id: string;
  customer_id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_at: string | null;
  description: string | null;
  helpers_count: number;
  status: ChangeRequestStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequestPhoto {
  id: string;
  change_request_id: string;
  storage_path: string;
  created_at: string;
}

export type NotificationType =
  | "order_status"
  | "driver_assigned"
  | "driver_location"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}
