import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DriverProfile, Order, Profile } from "@/types/domain";

// Fase 7 — testes unitários de autorização (secção 27 da especificação:
// "acesso de customer/driver/admin"). `lib/orders/access.ts` é a segunda
// camada de defesa em modo demo (a RLS do Supabase é a primeira em
// produção — ver comentário no próprio ficheiro).
//
// `@/lib/db` importa `server-only`, que lança um erro fora de um
// ambiente de servidor Next — por isso é mockado aqui em vez de deixar o
// import real acontecer.
const getDriverProfileByUserId = vi.fn<(userId: string) => Promise<DriverProfile | null>>();

vi.mock("@/lib/db", () => ({
  getRepository: () => ({
    getDriverProfileByUserId,
  }),
}));

const { canAccessOrder } = await import("./access");

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: "user-1",
    role: "customer",
    full_name: "Teste",
    email: "teste@vaija.pt",
    phone: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: "order-1",
    public_order_number: "VJ-2026-0001",
    customer_id: "customer-1",
    driver_id: null,
    service_type: "materials",
    timing_type: "now",
    scheduled_at: null,
    pickup_address: "Porto",
    pickup_lat: null,
    pickup_lng: null,
    destination_address: "Braga",
    destination_lat: null,
    destination_lng: null,
    distance_km: null,
    cargo_description: null,
    cargo_weight_kg: null,
    package_count: null,
    vehicle_category: "van",
    needs_helpers: false,
    helpers_count: 0,
    helper_hours: 0,
    passenger: false,
    payment_method: "mbway",
    payment_status: "DEMO_PAID",
    base_price: 25,
    distance_price: 0,
    helper_price: 0,
    tolls: 0,
    total_price: 25,
    status: "SEARCHING_DRIVER",
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  getDriverProfileByUserId.mockReset();
});

describe("canAccessOrder — admin", () => {
  it("admin tem sempre acesso, independentemente do dono do pedido", async () => {
    const admin = { profile: makeProfile({ id: "admin-1", role: "admin" }) };
    const order = makeOrder({ customer_id: "outro-customer", driver_id: "outro-driver" });
    expect(await canAccessOrder(admin, order)).toBe(true);
    expect(getDriverProfileByUserId).not.toHaveBeenCalled();
  });
});

describe("canAccessOrder — customer", () => {
  it("cliente dono do pedido tem acesso", async () => {
    const customer = { profile: makeProfile({ id: "customer-1", role: "customer" }) };
    const order = makeOrder({ customer_id: "customer-1" });
    expect(await canAccessOrder(customer, order)).toBe(true);
  });

  it("cliente que não é dono do pedido não tem acesso", async () => {
    const customer = { profile: makeProfile({ id: "customer-2", role: "customer" }) };
    const order = makeOrder({ customer_id: "customer-1" });
    expect(await canAccessOrder(customer, order)).toBe(false);
  });
});

describe("canAccessOrder — driver", () => {
  it("motorista atribuído ao pedido tem acesso", async () => {
    getDriverProfileByUserId.mockResolvedValue({
      id: "driver-profile-1",
      user_id: "driver-user-1",
      status: "approved",
      service_area: null,
      availability_status: "available",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const driver = { profile: makeProfile({ id: "driver-user-1", role: "driver" }) };
    const order = makeOrder({ customer_id: "customer-1", driver_id: "driver-profile-1" });
    expect(await canAccessOrder(driver, order)).toBe(true);
  });

  it("motorista não atribuído a este pedido não tem acesso", async () => {
    getDriverProfileByUserId.mockResolvedValue({
      id: "driver-profile-2",
      user_id: "driver-user-2",
      status: "approved",
      service_area: null,
      availability_status: "available",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const driver = { profile: makeProfile({ id: "driver-user-2", role: "driver" }) };
    const order = makeOrder({ customer_id: "customer-1", driver_id: "driver-profile-1" });
    expect(await canAccessOrder(driver, order)).toBe(false);
  });

  it("motorista sem perfil de motorista associado não tem acesso", async () => {
    getDriverProfileByUserId.mockResolvedValue(null);
    const driver = { profile: makeProfile({ id: "driver-user-3", role: "driver" }) };
    const order = makeOrder({ customer_id: "customer-1", driver_id: "driver-profile-1" });
    expect(await canAccessOrder(driver, order)).toBe(false);
  });

  it("motorista não atribuído (driver_id nulo, pedido ainda a aguardar motorista) não tem acesso", async () => {
    getDriverProfileByUserId.mockResolvedValue({
      id: "driver-profile-1",
      user_id: "driver-user-1",
      status: "approved",
      service_area: null,
      availability_status: "available",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const driver = { profile: makeProfile({ id: "driver-user-1", role: "driver" }) };
    const order = makeOrder({ customer_id: "customer-1", driver_id: null });
    expect(await canAccessOrder(driver, order)).toBe(false);
  });
});
