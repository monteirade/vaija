import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { saveUploadedPhoto, isAllowedPhotoType, isAllowedPhotoSize } from "@/lib/uploads";

export async function POST(request: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }
  if (!isAllowedPhotoType(file.type)) {
    return NextResponse.json({ error: "Tipo de ficheiro não suportado. Use JPG, PNG, WEBP ou GIF." }, { status: 400 });
  }
  if (!isAllowedPhotoSize(file.size)) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 8MB)." }, { status: 400 });
  }

  const storagePath = await saveUploadedPhoto(user.profile.id, file);
  return NextResponse.json({ storagePath, url: `/api/uploads/${storagePath}` });
}
