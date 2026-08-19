import { z } from "zod";

export const createOrderSchema = z.object({
  timingType: z.enum(["now", "scheduled"]),
  scheduledAt: z.string().nullable().optional(),
  serviceType: z.enum(["materials", "debris", "team_with_tools", "moving", "other"]),
  pickupAddress: z.string().min(3, "Indique a morada de recolha."),
  destinationAddress: z.string().min(3, "Indique a morada de destino."),
  cargoDescription: z.string().min(1, "Descreva a carga."),
  cargoWeightKg: z.number().positive("Indique um peso válido."),
  packageCount: z.number().int().min(1).max(500),
  photos: z
    .array(z.object({ storagePath: z.string() }))
    .default([]),
  vehicleCategory: z.enum(["van", "small_truck", "large_truck"]),
  needsHelpers: z.boolean(),
  helpersCount: z.number().int().min(0).max(10),
  helperHours: z.number().min(0).max(24),
  passenger: z.boolean(),
  paymentMethod: z.enum(["card", "mbway", "cash"]),
  notes: z.string().optional(),
});

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

export const createChangeRequestSchema = z.object({
  pickupAddress: z.string().min(3, "Indique a morada de origem."),
  destinationAddress: z.string().min(3, "Indique a morada de destino."),
  scheduledAt: z.string().nullable().optional(),
  description: z.string().min(1, "Descreva a mudança."),
  helpersCount: z.number().int().min(0).max(10),
  photos: z.array(z.object({ storagePath: z.string() })).default([]),
});

export type CreateChangeRequestPayload = z.infer<typeof createChangeRequestSchema>;
