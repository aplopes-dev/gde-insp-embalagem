"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  parseDeviceId,
  persistDeviceId,
  readStoredDeviceId,
} from "@/shared/utils/device-id";

/**
 * Grava o deviceId do atalho e volta a pô-lo na URL após login, logout ou F5.
 * Sem isto, o build cai no NEXT_PUBLIC_DEVICE_ID (quase sempre realwear_01).
 */
function DeviceIdKeeperInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromQuery = parseDeviceId(searchParams.get("deviceId"));
    if (fromQuery) {
      persistDeviceId(fromQuery);
      return;
    }
    const stored = readStoredDeviceId();
    if (!stored) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("deviceId", stored);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  return null;
}

export function DeviceIdKeeper() {
  return (
    <Suspense fallback={null}>
      <DeviceIdKeeperInner />
    </Suspense>
  );
}
