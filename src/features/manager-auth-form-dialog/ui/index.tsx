"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authorizeBreakWithJerp } from "../actions";

export const opBreakAuthorizationSchema = z.object({
  quantity: z.number().min(1),
  email: z.string().email(),
  password: z.string().min(3),
});

export type OpBreakAuthorizationType = z.infer<
  typeof opBreakAuthorizationSchema
>;

type ManagerAuthFormDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  initialQuantity?: number;
  // Soma dos blisters já embalados na caixa (não inclui o último em conferência).
  packedQuantity?: number;
  // Quantidade planejada para a caixa cheia (usada para detectar caixa incompleta).
  expectedQuantity?: number;
  onOpenChange: (open: boolean) => void;
  onManagerAuth: (quantity: number, managerId: string) => void;
};

const ManagerAuthFormDialog = ({
  title,
  message,
  isOpen,
  initialQuantity,
  packedQuantity = 0,
  expectedQuantity,
  onOpenChange,
  onManagerAuth,
}: ManagerAuthFormDialogProps) => {
  const form = useForm<OpBreakAuthorizationType>({
    resolver: zodResolver(opBreakAuthorizationSchema),
    defaultValues: {
      quantity: initialQuantity || 1,
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const {
    formState: { errors },
    reset,
    register,
    watch,
  } = form;

  const [confirmUnderfill, setConfirmUnderfill] = useState(false);

  const watchedQuantity = Number(watch("quantity")) || 0;
  // Total consolidado da caixa: já embalado + o último blister em conferência.
  const boxTotal = packedQuantity + watchedQuantity;
  const isUnderfilled =
    expectedQuantity != null && boxTotal < expectedQuantity;

  const onSubmit = form.handleSubmit(async (data) => {
    const { quantity, email, password } = data as any;

    if (isUnderfilled && !confirmUnderfill) {
      toast({
        title: "Confirmação necessária",
        description:
          "A caixa está abaixo do total esperado. Confirme a finalização com quebra.",
        variant: "destructive",
      });
      return;
    }

    await authorizeBreakWithJerp(email, password)
      .then((id) => {
        toast({
          title: "Sucesso",
          description: "Autorizado com sucesso!",
        });
        onManagerAuth(quantity, `${id}`);
        onOpenChange(false);
      })
      .catch((err) => {
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        });
      });
  });

  useEffect(() => {
    if (isOpen) {
      reset({ quantity: initialQuantity, email: "", password: "" });
      setConfirmUnderfill(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div>
          <Form {...form}>
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade do último blister</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Insira a nova quantidade autorizada"
                        {...register("quantity", {
                          valueAsNumber: true,
                        })}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="rounded-md border p-3 text-sm bg-muted/40">
                <div className="flex justify-between">
                  <span>Já embalado na caixa:</span>
                  <strong>{packedQuantity} peças</strong>
                </div>
                <div className="flex justify-between">
                  <span>Último blister (conferência):</span>
                  <strong>{watchedQuantity} peças</strong>
                </div>
                <div className="mt-1 flex justify-between border-t pt-1">
                  <span>Total da caixa:</span>
                  <strong>{boxTotal} peças</strong>
                </div>
                {expectedQuantity != null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Esperado (caixa cheia):</span>
                    <span>{expectedQuantity} peças</span>
                  </div>
                )}
              </div>

              {isUnderfilled && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">
                    Atenção: a caixa está abaixo do total esperado (
                    {boxTotal} de {expectedQuantity}).
                  </p>
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmUnderfill}
                      onChange={(e) => setConfirmUnderfill(e.target.checked)}
                    />
                    <span>
                      Confirmo que a caixa será finalizada com quebra abaixo do
                      esperado.
                    </span>
                  </label>
                </div>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Insira o e-mail do responsável"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Insira a senha"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="mt-4 gap-2 flex justify-end">
                <Button
                  type="button"
                  variant={"outline"}
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !form.formState.isDirty ||
                    !form.formState.isValid ||
                    form.formState.isSubmitting ||
                    (isUnderfilled && !confirmUnderfill)
                  }
                >
                  Confirmar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManagerAuthFormDialog;
