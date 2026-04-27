"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlassesDeviceId } from "@/hooks/use-glasses-device-id";
import { useEffect, useState } from "react";

type CatalogItem = { deviceId: string; label: string };

export function GlassesPickerCard({ onSelected }: { onSelected?: () => void }) {
  const { deviceId, setDeviceId, ready } = useGlassesDeviceId();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/glasses/catalog");
        if (!res.ok) throw new Error("Falha ao carregar catálogo");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items)) {
          setItems(data.items);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (items.length && !choice) {
      setChoice(deviceId ?? items[0].deviceId);
    }
  }, [items, deviceId, choice]);

  useEffect(() => {
    if (deviceId) setChoice(deviceId);
  }, [deviceId]);

  const handleConfirm = () => {
    if (!choice) return;
    setDeviceId(choice);
    onSelected?.();
  };

  if (!ready || loading) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Escolher óculos</CardTitle>
          <CardDescription>Carregando…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card className="max-w-lg mx-auto border-destructive">
        <CardHeader>
          <CardTitle>Catálogo vazio</CardTitle>
          <CardDescription>
            Defina GLASSES_CATALOG_JSON no ambiente do servidor.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Escolher óculos</CardTitle>
        <CardDescription>
          Selecione qual unidade está nesta estação. O vídeo e a detecção no
          backend usarão este identificador.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Select value={choice} onValueChange={setChoice}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.deviceId} value={item.deviceId}>
                {item.label} ({item.deviceId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleConfirm} disabled={!choice}>
          Confirmar
        </Button>
      </CardContent>
    </Card>
  );
}
