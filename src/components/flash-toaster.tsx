"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function FlashToaster() {
  const sp = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!sp) return;
    const ok = sp.get("ok");
    const msg = sp.get("msg");
    const err = sp.get("error");
    if (ok && (msg || !err)) {
      toast({ title: "Sucesso", description: msg || "Operação realizada com sucesso." });
    } else if (err) {
      toast({ title: "Erro", description: err, variant: "destructive" as any });
    }
    if (ok || msg || err) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ok");
      url.searchParams.delete("msg");
      url.searchParams.delete("error");
      router.replace(url.toString());
    }
  }, [sp, router, toast]);

  return null;
}

