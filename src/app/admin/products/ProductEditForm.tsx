"use client";

import { useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { DialogClose } from "@/components/ui/dialog";
import { z } from "zod";

type Props = {
  action: (fd: FormData) => Promise<any>;
  product: { id: number; name: string };
  box: { id: number; name: string };
  blister: { id: number; name: string; slots: number; limitPerBox: number };
};

export default function ProductEditForm({ action, product, box, blister }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  async function clientAction(fd: FormData) {
    startTransition(async () => {
      try {
        const productName = String(fd.get("productName") || "").trim();
        const boxName = String(fd.get("boxName") || "").trim();
        const blisterName = String(fd.get("blisterName") || "").trim();
        const slots = Number(fd.get("slots"));
        const limitPerBox = Number(fd.get("limitPerBox"));

        // Validação com Zod
        const Schema = z.object({
          productName: z.string().optional(),
          boxName: z.string().optional(),
          blisterName: z.string().optional(),
          slots: z.number().int().positive("Slots deve ser maior que zero."),
          limitPerBox: z.number().int().positive("Limite por caixa deve ser maior que zero."),
        });
        const parsed = Schema.safeParse({ productName, boxName, blisterName, slots, limitPerBox });
        if (!parsed.success) {
          const msg = parsed.error.issues?.[0]?.message || "Dados inválidos.";
          toast({ variant: "destructive", title: "Erro de validação", description: msg });
          return;
        }

        // Detecta se há alterações
        const noChanges =
          productName === product.name &&
          boxName === box.name &&
          blisterName === blister.name &&
          slots === blister.slots &&
          limitPerBox === blister.limitPerBox;
        if (noChanges) {
          toast({ variant: "warning", title: "Nada para salvar", description: "Nenhuma alteração detectada." });
          return;
        }

        const res = await action(fd);
        if (res?.status === "error") {
          toast({ variant: "destructive", title: "Falha ao salvar", description: res?.message || "Tente novamente." });
          return;
        }
        if (res?.status === "noop") {
          toast({ variant: "warning", title: "Nada para salvar", description: res?.message || "Nenhuma alteração detectada." });
          return;
        }

        toast({ variant: "success", title: "Salvo", description: "As configurações foram atualizadas com sucesso." });
        // Fecha o diálogo após salvar com sucesso
        closeRef.current?.click();
      } catch (e: any) {
        toast({ variant: "destructive", title: "Falha ao salvar", description: e?.message || "Tente novamente." });
      }
    });
  }

  return (
    <form action={clientAction} className="grid gap-3 mt-2">
      <input type="hidden" name="productTypeId" value={product.id} />
      <input type="hidden" name="boxTypeId" value={box.id} />
      <input type="hidden" name="blisterTypeId" value={blister.id} />

      <div className="grid gap-2">
        <div className="text-xs font-medium">Editar Produto</div>
        <Label htmlFor="productName" className="sr-only">Nome do produto</Label>
        <Input id="productName" name="productName" placeholder="Nome do produto" defaultValue={product.name} />
      </div>

      <div className="grid gap-2">
        <div className="text-xs font-medium">Editar Caixa</div>
        <Label htmlFor="boxName" className="sr-only">Nome da caixa</Label>
        <Input id="boxName" name="boxName" placeholder="Nome da caixa" defaultValue={box.name} />
      </div>

      <div className="grid gap-2">
        <div className="text-xs font-medium">Editar Blister</div>
        <Label htmlFor="blisterName" className="sr-only">Nome do blister</Label>
        <Input id="blisterName" name="blisterName" placeholder="Nome do blister" defaultValue={blister.name} />
        <div className="grid grid-cols-2 gap-2">
          <Label htmlFor="slots" className="sr-only">Slots</Label>
          <Input id="slots" name="slots" placeholder="Slots" type="number" defaultValue={blister.slots} />
          <Label htmlFor="limitPerBox" className="sr-only">Limite por caixa</Label>
          <Input id="limitPerBox" name="limitPerBox" placeholder="Limite por caixa" type="number" defaultValue={blister.limitPerBox} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {/* Botão escondido para fechar o diálogo programaticamente */}
        <DialogClose ref={closeRef as any} className="hidden" />
        <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar alterações"}</Button>
      </div>
    </form>
  );
}

