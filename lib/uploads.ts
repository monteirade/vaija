import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Armazenamento de fotos — modo demo.
//
// Em produção (Supabase configurado), o upload deve usar Supabase Storage
// (secção 20 da especificação) — bucket privado + URL assinado. Em modo
// demo, guardamos os ficheiros no disco local em data/uploads/<userId>/...
// e servimos através de app/api/uploads/[...path]/route.ts, que exige
// sessão autenticada. Isto cumpre "não expor ficheiros privados
// diretamente sem autorização adequada" de forma simplificada — ver
// docs/TODO.md para a limitação (qualquer utilizador autenticado pode ver
// qualquer foto demo; produção precisa de verificação por pedido).

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function isAllowedPhotoType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

export function isAllowedPhotoSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_FILE_BYTES;
}

export async function saveUploadedPhoto(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const fileName = `${randomUUID()}.${ext || "jpg"}`;
  const userDir = path.join(UPLOADS_DIR, userId);
  await fs.mkdir(userDir, { recursive: true });
  const filePath = path.join(userDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  // storage_path relativo, tal como aconteceria com um `storage_path` do Supabase Storage.
  return `${userId}/${fileName}`;
}

export function resolveUploadPath(storagePath: string): string {
  const safe = path.normalize(storagePath).replace(/^(\.\.[/\\])+/, "");
  return path.join(UPLOADS_DIR, safe);
}

export const MAX_FILE_BYTES_LABEL = "8MB";
