"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, MapPinOff } from "lucide-react";

const SEND_INTERVAL_MS = 6000; // secção 8: "a cada 5-10 segundos"

export function LocationSharing() {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSendRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function start() {
    if (!("geolocation" in navigator)) {
      setError("Geolocalização não suportada neste navegador.");
      return;
    }
    setError(null);
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSendRef.current < SEND_INTERVAL_MS) return;
        lastSendRef.current = now;
        const { latitude, longitude, accuracy } = position.coords;
        fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lng: longitude, accuracy }),
        }).catch(() => {});
        setLastSent({ lat: latitude, lng: longitude });
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização recusada."
            : "Não foi possível obter a localização."
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = id;
    setSharing(true);
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {sharing ? <MapPin className="size-4 text-brand-yellow" /> : <MapPinOff className="size-4 text-muted-foreground" />}
          <span>{sharing ? "A partilhar localização" : "Localização não partilhada"}</span>
        </div>
        <Button size="sm" variant={sharing ? "secondary" : "primary"} onClick={sharing ? stop : start}>
          {sharing ? "Parar" : "Permitir localização"}
        </Button>
      </div>
      {lastSent && (
        <p className="mt-2 text-xs text-muted-foreground">
          Última posição enviada: {lastSent.lat.toFixed(4)}, {lastSent.lng.toFixed(4)}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Funciona apenas enquanto esta página estiver aberta (sem tracking em segundo plano).
      </p>
    </div>
  );
}
