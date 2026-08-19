"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveClientDeviceId } from "@/shared/utils/device-id";
import { withDeviceQuery } from "@/shared/utils/with-device-query";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const q =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("deviceId")
          : null;
      router.replace(withDeviceQuery("/login", resolveClientDeviceId(q)));
    }
  }, [status, router]);

  if (status === "loading") return null;
  if (status === "unauthenticated") return null;

  return <>{children}</>;
}

