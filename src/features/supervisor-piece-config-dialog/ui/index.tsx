"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { saveSupervisorPieceConfig } from "../actions";

type SupervisorPieceConfigDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pieceName: string;
  blisterTypeId?: number;
  externalOpId: number;
  initialSlots?: number;
  initialLimitPerBox?: number;
  onConfirmed: () => void;
};

export default function SupervisorPieceConfigDialog({
  isOpen,
  onOpenChange,
  pieceName,
  blisterTypeId,
  externalOpId,
  initialSlots,
  initialLimitPerBox,
  onConfirmed,
}: SupervisorPieceConfigDialogProps) {
  const [slots, setSlots] = useState<number | "">(initialSlots ?? "");
  const [limitPerBox, setLimitPerBox] = useState<number | "">(initialLimitPerBox ?? "");
  const [managerCode, setManagerCode] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSlots(initialSlots ?? "");
      setLimitPerBox(initialLimitPerBox ?? "");
      setManagerCode("");
      setManagerPassword("");
    }
  }, [isOpen, initialSlots, initialLimitPerBox]);

  const handleConfirm = async () => {
    try {
      if (!slots || !limitPerBox) {
        toast({ title: "Campos obrigatórios", description: "Informe os valores.", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      await saveSupervisorPieceConfig({
        blisterTypeId: blisterTypeId ? Number(blisterTypeId) : undefined,
        externalOpId: Number(externalOpId),
        slots: Number(slots),
        limitPerBox: Number(limitPerBox),
        managerCode,
        managerPassword,
      });
      toast({ title: "Sucesso", description: "Parâmetros salvos" });
      onOpenChange(false);
      onConfirmed();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Cadastramento de peça: {pieceName}
          </DialogTitle>
          <DialogDescription>
            Informe os parâmetros e autorização do supervisor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Peças por blister</Label>
            <Input
              type="number"
              value={slots}
              onChange={(e) => setSlots(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex.: 10"
            />
          </div>
          <div className="grid gap-2">
            <Label>Blister por caixa</Label>
            <Input
              type="number"
              value={limitPerBox}
              onChange={(e) => setLimitPerBox(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex.: 1"
            />
          </div>

          <div className="pt-2 border-t" />

          <div className="grid gap-2">
            <Label>Autorização do responsável</Label>
            <div className="grid gap-2">
              <Input placeholder="Código" value={managerCode} onChange={(e) => setManagerCode(e.target.value)} />
              <Input placeholder="Senha" type="password" value={managerPassword} onChange={(e) => setManagerPassword(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

