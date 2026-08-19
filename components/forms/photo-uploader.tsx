"use client";

import { useRef, useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";

export interface UploadedPhoto {
  storagePath: string;
  url: string;
  name: string;
}

interface PhotoUploaderProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  label?: string;
}

// Upload de qualquer número de fotografias (secção 20 da especificação):
// validação de tipo/tamanho no servidor (app/api/uploads/route.ts), preview
// antes do envio e possibilidade de remover antes de confirmar.
export function PhotoUploader({ photos, onChange, label = "Fotografias (opcional)" }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const uploaded: UploadedPhoto[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha no upload.");
        uploaded.push({ storagePath: data.storagePath, url: data.url, name: file.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no upload.");
      }
    }
    onChange([...photos, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(storagePath: string) {
    onChange(photos.filter((p) => p.storagePath !== storagePath));
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div key={photo.storagePath} className="group relative size-20 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.name} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(photo.storagePath)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remover foto"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          <span className="text-[10px]">Adicionar</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
