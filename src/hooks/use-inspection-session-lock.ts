import { useEffect, useRef, useState } from "react";

const LOCK_TTL_MS = 5_000;
const HEARTBEAT_MS = 2_000;
const TAB_ID_KEY = "gde-tab-id";

function lockStorageKey(deviceId: string) {
  return `gde:inspection-lock:${deviceId}`;
}

function createTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTabId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id = createTabId();
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    return createTabId();
  }
}

/**
 * Garante uma única aba de inspeção ativa por óculos (deviceId).
 * Impede que duas OPs (ou duas abas da mesma OP) enviem comandos ao mesmo worker.
 * Usa Web Locks quando disponível; fallback com heartbeat em localStorage.
 */
export function useInspectionSessionLock(deviceId?: string, _opId?: string) {
  const [isLeader, setIsLeader] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const tabIdRef = useRef("");
  const releaseLockRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!tabIdRef.current) {
      tabIdRef.current = getTabId();
    }
    if (!deviceId) {
      setIsLeader(true);
      setIsChecking(false);
      return;
    }

    let cancelled = false;
    const lockName = `gde-inspection:${deviceId}`;

    const startLocalStorageLock = () => {
      const key = lockStorageKey(deviceId);
      const tabId = tabIdRef.current;

      const tick = () => {
        if (cancelled) return;
        const now = Date.now();
        let entry: { tabId: string; ts: number } | null = null;
        try {
          const raw = localStorage.getItem(key);
          entry = raw ? JSON.parse(raw) : null;
        } catch {
          entry = null;
        }

        const expired = !entry || now - entry.ts > LOCK_TTL_MS;
        const ownedByUs = entry?.tabId === tabId;

        if (expired || ownedByUs) {
          localStorage.setItem(key, JSON.stringify({ tabId, ts: now }));
          setIsLeader(true);
        } else {
          setIsLeader(false);
        }
        setIsChecking(false);
      };

      tick();
      const interval = window.setInterval(tick, HEARTBEAT_MS);

      return () => {
        window.clearInterval(interval);
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry = JSON.parse(raw) as { tabId: string };
            if (entry.tabId === tabId) localStorage.removeItem(key);
          }
        } catch {
          /* ignore */
        }
      };
    };

    let cleanupStorage: (() => void) | undefined;

    const acquire = async () => {
      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        try {
          await navigator.locks.request(
            lockName,
            { ifAvailable: true },
            async (lock) => {
              if (cancelled) return;
              if (!lock) {
                setIsLeader(false);
                setIsChecking(false);
                return;
              }
              setIsLeader(true);
              setIsChecking(false);
              await new Promise<void>((resolve) => {
                releaseLockRef.current = resolve;
              });
            }
          );
          return;
        } catch {
          /* fallback abaixo */
        }
      }
      cleanupStorage = startLocalStorageLock();
    };

    acquire();

    return () => {
      cancelled = true;
      releaseLockRef.current?.();
      releaseLockRef.current = null;
      cleanupStorage?.();
    };
  }, [deviceId]);

  return { isLeader, isChecking };
}
