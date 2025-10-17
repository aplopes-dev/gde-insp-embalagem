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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { PackagingJerpDto } from "@/types/dtos/op-jerp-dto";
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
  isNewOp?: boolean;
  availableBlisters?: PackagingJerpDto[];
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
  isNewOp,
  availableBlisters,
}: SupervisorPieceConfigDialogProps) {
  const [slots, setSlots] = useState<number | "">(initialSlots ?? "");
  const [limitPerBox, setLimitPerBox] = useState<number | "">(initialLimitPerBox ?? "");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedBlisterPackagingId, setSelectedBlisterPackagingId] = useState<number | undefined>(
    availableBlisters && availableBlisters.length === 1 ? availableBlisters[0].id : undefined
  );

  useEffect(() => {
    if (isOpen) {
      setSlots(initialSlots ?? "");
      setLimitPerBox(initialLimitPerBox ?? "");
      setManagerEmail("");
      setManagerPassword("");
      setSelectedBlisterPackagingId(
        availableBlisters && availableBlisters.length === 1 ? availableBlisters[0].id : undefined
      );
    }
  }, [isOpen, initialSlots, initialLimitPerBox, availableBlisters]);

  const handleConfirm = async () => {
    try {
      if (!slots || !limitPerBox) {
        toast({ title: "Campos obrigatórios", description: "Informe os valores.", variant: "destructive" });
        return;
      }
      if (availableBlisters && availableBlisters.length > 1 && !selectedBlisterPackagingId) {
        toast({ title: "Seleção obrigatória", description: "Selecione o tipo de blister.", variant: "destructive" });
        return;
      }
      setSubmitting(true);
      await saveSupervisorPieceConfig({
        blisterTypeId: blisterTypeId ? Number(blisterTypeId) : undefined,
        externalOpId: Number(externalOpId),
        slots: Number(slots),
        limitPerBox: Number(limitPerBox),
        managerEmail,
        managerPassword,
        selectedBlisterPackagingId,
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
          <DialogDescription style={{ color: "red" }} className="text-lg">
            Contate o supervisor.
          </DialogDescription>
        </DialogHeader>

        {isNewOp && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
            <div className="flex-col items-center">
              <div className="font-bold text-sm uppercase">
                ⚠️ OP NOVA - CONFIRA A GUIA.
              </div>
              <div className="font-bold text-sm uppercase">
                *CONSULTE O DOCUMENTO COM O PADRÃO DE EMBALAGEM!
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Seleção de Blister */}
          {availableBlisters && availableBlisters.length > 0 && (
            <div className="grid gap-2">
              <Label>Tipo de Blister *</Label>
              {availableBlisters.length === 1 ? (
                <Input
                  value={availableBlisters[0].nome}
                  disabled
                  className="cursor-not-allowed"
                  placeholder="Blister único disponível"
                />
              ) : (
                <Select
                  value={selectedBlisterPackagingId?.toString()}
                  onValueChange={(value) => setSelectedBlisterPackagingId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de blister correto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBlisters.map((blister) => (
                      <SelectItem key={blister.id} value={blister.id.toString()}>
                        {blister.nome} (ID: {blister.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-gray-600">
                {availableBlisters.length === 1
                  ? "Apenas um tipo de blister disponível"
                  : "Escolha o blister do produto (não a tampa)"}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Informe a quantidade de peças por blister:</Label>
            <Input
              type="number"
              value={slots}
              onChange={(e) => setSlots(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex.: 10"
            />
            <p className="text-xs text-gray-600">Quantidade de peças que cabem em um blister</p>
          </div>
          <div className="grid gap-2">
            <Label>Informe a quantidade de blister por caixa:</Label>
            <Input
              type="number"
              value={limitPerBox}
              onChange={(e) => setLimitPerBox(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Ex.: 1"
            />
            <p className="text-xs text-gray-600">Quantidade de blisters que cabem em uma caixa</p>
          </div>

          <div className="pt-2 border-t" />

          <div className="grid gap-2">
            <Label>Autorização do responsável</Label>
            <div className="grid gap-2">
              <Input placeholder="E-mail" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} />
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

