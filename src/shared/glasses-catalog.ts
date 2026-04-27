export type GlassesCatalogEntry = {
  deviceId: string;
  label: string;
  adbTarget?: string;
};

const STORAGE_KEY = "gde_glasses_device_id";

export function getStoredGlassesDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setStoredGlassesDeviceId(deviceId: string) {
  sessionStorage.setItem(STORAGE_KEY, deviceId);
}

export function clearStoredGlassesDeviceId() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function parseGlassesCatalogFromEnv(json: string | undefined): GlassesCatalogEntry[] {
  if (!json?.trim()) {
    return [
      { deviceId: "default", label: "Óculos padrão" },
      { deviceId: "rw-line-b", label: "Óculos linha 2" },
    ];
  }
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) return [];
  const out: GlassesCatalogEntry[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const deviceId = typeof o.deviceId === "string" ? o.deviceId : null;
    const label =
      typeof o.label === "string" ? o.label : deviceId ? deviceId : null;
    if (!deviceId || !label) continue;
    const adbTarget =
      typeof o.adbTarget === "string" ? o.adbTarget : undefined;
    out.push({ deviceId, label, adbTarget });
  }
  return out;
}
