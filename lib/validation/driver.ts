import { z } from "zod";

export const driverApplicationSchema = z.object({
  full_name: z.string().min(2, "Indique o seu nome."),
  email: z.string().email("Email inválido."),
  phone: z.string().min(9, "Indique um telefone válido."),
  vehicle_category: z.enum(["van", "small_truck", "large_truck"]),
  vehicle_make: z.string().min(1, "Indique a marca."),
  vehicle_model: z.string().min(1, "Indique o modelo."),
  vehicle_registration: z.string().min(4, "Indique a matrícula."),
  vehicle_capacity_kg: z.number().positive("Indique a capacidade em kg."),
  service_area: z.string().min(2, "Indique a zona de operação."),
  availability: z.string().min(2, "Indique a disponibilidade."),
});

export type DriverApplicationPayload = z.infer<typeof driverApplicationSchema>;
