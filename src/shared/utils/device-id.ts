/** Cookie + sessionStorage: cada desktop de baia guarda o óculos do atalho. */
export const DEVICE_ID_COOKIE = "gde_device_id";
export const DEVICE_ID_STORAGE_KEY = "gde_device_id";

const DEVICE_ID_MAX_AGE_SEC = 60 * 60 * 24 * 365;

export function parseDeviceId(raw?: string | null): string | undefined {
  const d = raw?.trim();
  if (!d) return undefined;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(d)) return undefined;
  return d;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function readStoredDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const fromStorage = parseDeviceId(
      sessionStorage.getItem(DEVICE_ID_STORAGE_KEY)
    );
    if (fromStorage) return fromStorage;
  } catch {
    /* private mode */
  }
  return parseDeviceId(readCookie(DEVICE_ID_COOKIE));
}

export function persistDeviceId(deviceId: string): void {
  const d = parseDeviceId(deviceId);
  if (!d || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DEVICE_ID_STORAGE_KEY, d);
  } catch {
    /* private mode */
  }
  document.cookie = `${DEVICE_ID_COOKIE}=${encodeURIComponent(d)}; Path=/; Max-Age=${DEVICE_ID_MAX_AGE_SEC}; SameSite=Lax`;
}

/** Query da URL, senão o valor guardado neste browser (não usa NEXT_PUBLIC_DEVICE_ID). */
export function resolveClientDeviceId(
  queryValue?: string | null
): string | undefined {
  return parseDeviceId(queryValue) || readStoredDeviceId();
}
