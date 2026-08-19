"use client";

import { useSearchParams } from "next/navigation";
import { resolveClientDeviceId } from "@/shared/utils/device-id";

/** deviceId do atalho (?deviceId=) ou o último gravado neste Chrome da baia. */
export function useDeviceId(): string | undefined {
  const searchParams = useSearchParams();
  return resolveClientDeviceId(searchParams.get("deviceId"));
}
