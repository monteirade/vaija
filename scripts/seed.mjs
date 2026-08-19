// Dados de demonstração — modo demo (secção 24 da especificação).
// Corre com: npm run seed
// Idempotente: pode ser corrido várias vezes sem duplicar as contas fixas
// (admin, cliente demo, motorista demo); os pedidos de exemplo são sempre
// recriados para garantir um estado limpo e previsível para a demo.

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "demo.sqlite3");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "lib", "db", "demo", "schema.sql"), "utf-8"));

const now = () => new Date().toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

// ---- Pricing (espelha lib/pricing — ver docs/TODO.md sobre duplicação aceitável em scripts de seed) ----
const VEHICLES = {
  van: { basePrice: 25, includedKm: 15, pricePerExtraKm: 0.65 },
  small_truck: { basePrice: 55, includedKm: 15, pricePerExtraKm: 0.95 },
  large_truck: { basePrice: 110, includedKm: 15, pricePerExtraKm: 1.5 },
};
function calcPrice(vehicleCategory, distanceKm, helpersCount = 0, helperHours = 0) {
  const v = VEHICLES[vehicleCategory];
  const distancePrice = Math.round(Math.max(0, distanceKm - v.includedKm) * v.pricePerExtraKm * 100) / 100;
  const helperPrice = Math.round(helpersCount * helperHours * 25 * 100) / 100;
  const totalPrice = Math.round((v.basePrice + distancePrice + helperPrice) * 100) / 100;
  return { basePrice: v.basePrice, distancePrice, helperPrice, tolls: 0, totalPrice };
}

function upsertProfile({ email, role, full_name, phone, password }) {
  const existing = db.prepare("select * from profiles where email = ?").get(email);
  if (existing) {
    db.prepare("update profiles set role = ?, full_name = ?, phone = ? where id = ?").run(role, full_name, phone, existing.id);
    return existing.id;
  }
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `insert into profiles (id, role, full_name, email, phone, password_hash, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, role, full_name, email, phone, bcrypt.hashSync(password, 10), ts, ts);
  return id;
}

function upsertDriverProfile(userId, serviceArea) {
  const existing = db.prepare("select * from driver_profiles where user_id = ?").get(userId);
  if (existing) {
    db.prepare("update driver_profiles set status = 'approved', availability_status = 'available' where id = ?").run(existing.id);
    return existing.id;
  }
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `insert into driver_profiles (id, user_id, status, service_area, availability_status, created_at, updated_at)
     values (?, ?, 'approved', ?, 'available', ?, ?)`
  ).run(id, userId, serviceArea, ts, ts);
  return id;
}

function ensureVehicle(driverId, vehicle) {
  const existing = db.prepare("select id from vehicles where driver_id = ? and registration = ?").get(driverId, vehicle.registration);
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare(
    `insert into vehicles (id, driver_id, category, make, model, registration, capacity_kg, created_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, driverId, vehicle.category, vehicle.make, vehicle.model, vehicle.registration, vehicle.capacity_kg, now());
  return id;
}

function createOrder({
  customerId,
  driverId,
  serviceType,
  status,
  pickup,
  destination,
  vehicleCategory,
  helpersCount = 0,
  helperHours = 0,
  createdHoursAgo = 1,
}) {
  const id = randomUUID();
  const publicNumber = `VJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const price = calcPrice(vehicleCategory, destination.distanceKm, helpersCount, helperHours);
  const ts = hoursAgo(createdHoursAgo);
  db.prepare(
    `insert into orders (
      id, public_order_number, customer_id, driver_id, service_type, timing_type, scheduled_at,
      pickup_address, pickup_lat, pickup_lng, destination_address, destination_lat, destination_lng,
      distance_km, cargo_description, cargo_weight_kg, package_count, vehicle_category,
      needs_helpers, helpers_count, helper_hours, passenger, payment_method, payment_status,
      base_price, distance_price, helper_price, tolls, total_price, status, notes, created_at, updated_at
    ) values (
      @id, @public_order_number, @customer_id, @driver_id, @service_type, 'now', null,
      @pickup_address, @pickup_lat, @pickup_lng, @destination_address, @destination_lat, @destination_lng,
      @distance_km, @cargo_description, @cargo_weight_kg, @package_count, @vehicle_category,
      @needs_helpers, @helpers_count, @helper_hours, 0, @payment_method, @payment_status,
      @base_price, @distance_price, @helper_price, @tolls, @total_price, @status, null, @created_at, @updated_at
    )`
  ).run({
    id,
    public_order_number: publicNumber,
    customer_id: customerId,
    driver_id: driverId,
    service_type: serviceType,
    pickup_address: pickup.address,
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    destination_address: destination.address,
    destination_lat: destination.lat,
    destination_lng: destination.lng,
    distance_km: destination.distanceKm,
    cargo_description: "Carga de demonstração",
    cargo_weight_kg: 350,
    package_count: 3,
    vehicle_category: vehicleCategory,
    needs_helpers: helpersCount > 0 ? 1 : 0,
    helpers_count: helpersCount,
    helper_hours: helperHours,
    payment_method: "cash",
    payment_status: status === "DELIVERED" ? "PAY_ON_DELIVERY" : "PENDING",
    base_price: price.basePrice,
    distance_price: price.distancePrice,
    helper_price: price.helperPrice,
    tolls: price.tolls,
    total_price: price.totalPrice,
    status,
    created_at: ts,
    updated_at: now(),
  });

  db.prepare("insert into order_status_history (id, order_id, status, changed_by, created_at) values (?, ?, 'PENDING', ?, ?)").run(
    randomUUID(),
    id,
    customerId,
    ts
  );
  if (status !== "PENDING") {
    db.prepare("insert into order_status_history (id, order_id, status, changed_by, created_at) values (?, ?, ?, ?, ?)").run(
      randomUUID(),
      id,
      status,
      driverId ? customerId : customerId,
      now()
    );
  }

  return { id, publicNumber };
}

console.log("A semear dados de demonstração...\n");

// ---- Contas fixas ----
upsertProfile({ email: "admin@vaija.pt", role: "admin", full_name: "Admin Vai Já", phone: null, password: "admin1234" });
console.log("Admin:        admin@vaija.pt / admin1234");

const customerId = upsertProfile({
  email: "cliente@vaija.pt",
  role: "customer",
  full_name: "Cliente Demo",
  phone: "912345678",
  password: "cliente1234",
});
console.log("Cliente demo: cliente@vaija.pt / cliente1234");

const driverUserId = upsertProfile({
  email: "passos@vaija.pt",
  role: "driver",
  full_name: "Passos Dias Aguiar",
  phone: "913456789",
  password: "motorista1234",
});
const driverProfileId = upsertDriverProfile(driverUserId, "Porto, Braga e Guimarães");
ensureVehicle(driverProfileId, { category: "van", make: "Fiat", model: "Ducato", registration: "00-VJ-01", capacity_kg: 750 });
console.log("Motorista demo: passos@vaija.pt / motorista1234 (Passos Dias Aguiar, aprovado, van)");

// Um segundo motorista aprovado, para a demo de atribuição manual ter opções.
const driver2UserId = upsertProfile({
  email: "motorista2@vaija.pt",
  role: "driver",
  full_name: "Marta Oliveira Costa",
  phone: "914567890",
  password: "motorista1234",
});
const driver2ProfileId = upsertDriverProfile(driver2UserId, "Aveiro e Porto");
ensureVehicle(driver2ProfileId, { category: "small_truck", make: "Mercedes", model: "Sprinter", registration: "00-VJ-02", capacity_kg: 2800 });
console.log("Motorista demo 2: motorista2@vaija.pt / motorista1234 (Marta Oliveira Costa, aprovada, small truck)");

// ---- Localidades (mesmas do gazetteer em lib/maps/gazetteer.ts) ----
const PORTO = { address: "Porto", lat: 41.1579, lng: -8.6291 };
const BRAGA = { address: "Braga", lat: 41.5454, lng: -8.4265, distanceKm: 62.4 };
const GUIMARAES = { address: "Guimarães", lat: 41.4425, lng: -8.2918, distanceKm: 58.1 };
const AVEIRO = { address: "Aveiro", lat: 40.6405, lng: -8.6538, distanceKm: 87.3 };
const FEIRA = { address: "Santa Maria da Feira", lat: 40.9257, lng: -8.5486, distanceKm: 34.2 };

// limpar pedidos de demonstração anteriores (mantém pedidos criados manualmente por outros utilizadores)
db.prepare("delete from order_status_history where order_id in (select id from orders where notes = 'seed')").run();
db.prepare("delete from order_photos where order_id in (select id from orders where notes = 'seed')").run();
db.prepare("delete from orders where notes = 'seed'").run();

// 1) Pedido pendente, à procura de motorista (sem atribuição)
const o1 = createOrder({
  customerId,
  driverId: null,
  serviceType: "materials",
  status: "SEARCHING_DRIVER",
  pickup: PORTO,
  destination: BRAGA,
  vehicleCategory: "van",
  createdHoursAgo: 0.5,
});
console.log(`Pedido demo 1 (${o1.publicNumber}): SEARCHING_DRIVER, sem motorista`);

// 2) Pedido em transporte, atribuído a Passos Dias Aguiar, com localização
const o2 = createOrder({
  customerId,
  driverId: driverProfileId,
  serviceType: "moving",
  status: "IN_TRANSIT",
  pickup: PORTO,
  destination: GUIMARAES,
  vehicleCategory: "van",
  helpersCount: 2,
  helperHours: 2,
  createdHoursAgo: 2,
});
db.prepare("insert into driver_locations (id, driver_id, lat, lng, accuracy, recorded_at) values (?, ?, ?, ?, ?, ?)").run(
  randomUUID(),
  driverProfileId,
  41.24,
  -8.45,
  15,
  now()
);
console.log(`Pedido demo 2 (${o2.publicNumber}): IN_TRANSIT, motorista Passos Dias Aguiar, com localização`);

// 3) Pedido entregue (histórico)
const o3 = createOrder({
  customerId,
  driverId: driver2ProfileId,
  serviceType: "debris",
  status: "DELIVERED",
  pickup: PORTO,
  destination: FEIRA,
  vehicleCategory: "small_truck",
  createdHoursAgo: 48,
});
console.log(`Pedido demo 3 (${o3.publicNumber}): DELIVERED (histórico)`);

// 4) Pedido cancelado
const o4 = createOrder({
  customerId,
  driverId: null,
  serviceType: "other",
  status: "CANCELLED",
  pickup: PORTO,
  destination: AVEIRO,
  vehicleCategory: "van",
  createdHoursAgo: 30,
});
console.log(`Pedido demo 4 (${o4.publicNumber}): CANCELLED`);

// Marcar os 4 pedidos como pertencentes ao seed, para limpezas futuras
for (const o of [o1, o2, o3, o4]) {
  db.prepare("update orders set notes = 'seed' where id = ?").run(o.id);
}

// ---- Candidatura de motorista pendente ----
db.prepare(
  `insert into driver_applications (id, user_id, full_name, email, phone, vehicle_category, vehicle_make, vehicle_model, vehicle_registration, vehicle_capacity_kg, service_area, availability, status, notes, created_at)
   values (?, null, 'Rui Almeida Santos', 'rui.almeida.demo@example.com', '915678901', 'large_truck', 'Volvo', 'FL', '00-VJ-03', 12000, 'Porto e arredores', 'Fins de semana', 'pending', null, ?)`
).run(randomUUID(), hoursAgo(5));
console.log("Candidatura demo: Rui Almeida Santos (pending)");

// ---- Pedido de mudança ----
db.prepare(
  `insert into change_requests (id, customer_id, pickup_address, destination_address, scheduled_at, description, helpers_count, status, notes, created_at, updated_at)
   values (?, ?, 'Porto', 'Braga', ?, 'Mudança de apartamento T3, inclui eletrodomésticos grandes.', 3, 'pending_review', null, ?, ?)`
).run(randomUUID(), customerId, hoursAgo(-72), hoursAgo(3), hoursAgo(3));
console.log("Pedido de mudança demo: Porto -> Braga (pending_review)");

console.log("\nSeed concluído.");
db.close();
