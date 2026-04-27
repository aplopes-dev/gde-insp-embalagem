"use client";

import {
  getStoredGlassesDeviceId,
  setStoredGlassesDeviceId,
} from "@/shared/glasses-catalog";
import { useCallback, useEffect, useState } from "react";

export function useGlassesDeviceId() {
  const [deviceId, setDeviceIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDeviceIdState(getStoredGlassesDeviceId());
    setReady(true);
  }, []);

  const setDeviceId = useCallback((id: string) => {
    setStoredGlassesDeviceId(id);
    setDeviceIdState(id);
  }, []);

  return { deviceId, setDeviceId, ready };
}
