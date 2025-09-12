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
    const warn = sp.get("warn");

    const friendly = (code?: string | null): string | undefined => {
      switch (code) {
        case "usuario_criado":
          return "Usuário criado com sucesso.";
        case "perfil_atualizado":
          return "Perfil atualizado com sucesso.";
        case "senha_atualizada":
          return "Senha atualizada com sucesso.";
        case "permissao_alterada":
          return "Permissão alterada com sucesso.";
        default:
          return code || undefined;
      }
    };

    if (ok && (msg || !err)) {
      toast({ title: "Tudo certo", description: friendly(msg) || "Operação concluída com sucesso.", variant: "success" as any });
    } else if (warn) {
      toast({ title: "Atenção", description: friendly(warn) || "Verifique as informações e tente novamente.", variant: "warning" as any });
    } else if (err) {
      toast({ title: "Não foi possível concluir", description: friendly(err) || String(err), variant: "destructive" as any });
    }

    if (ok || msg || err || warn) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ok");
      url.searchParams.delete("msg");
      url.searchParams.delete("error");
      url.searchParams.delete("warn");
      router.replace(url.toString());
    }
  }, [sp, router, toast]);

  return null;
}

