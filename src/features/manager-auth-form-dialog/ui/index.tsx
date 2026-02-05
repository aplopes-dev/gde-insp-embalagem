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
import { useEffect } from "react";
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
  onOpenChange: (open: boolean) => void;
  onManagerAuth: (quantity: number, managerId: string) => void;
};

const ManagerAuthFormDialog = ({
  title,
  message,
  isOpen,
  initialQuantity,
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
  } = form;

  const onSubmit = form.handleSubmit(async (data) => {
    const { quantity, email, password } = data as any;
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
                    form.formState.isSubmitting
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
