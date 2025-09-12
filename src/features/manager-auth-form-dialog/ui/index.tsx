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
import { managarAuthorization } from "../actions";

export const opBreakAuthorizationSchema = z.object({
  quantity: z.number().min(1),
  username: z.string().min(1),
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
  requiredRole?: "OPERATOR" | "SUPERVISOR";
};

const ManagerAuthFormDialog = ({
  title,
  message,
  isOpen,
  initialQuantity,
  onOpenChange,
  onManagerAuth,
  requiredRole = "OPERATOR",
}: ManagerAuthFormDialogProps) => {
  const form = useForm<OpBreakAuthorizationType>({
    resolver: zodResolver(opBreakAuthorizationSchema),
    defaultValues: {
      quantity: initialQuantity || 1,
      username: "",
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
    const { quantity, username, password } = data as any;
    await managarAuthorization(username, password, requiredRole as any)
      .then((id) => {
        toast({ title: "Sucesso", description: "Autorizado com sucesso!" });
        onManagerAuth(quantity, `${id}`);
        onOpenChange(false);
      })
      .catch((err) => {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      });
  });

  useEffect(() => {
    if (isOpen) {
      reset({ quantity: initialQuantity, username: "", password: "" });
    }
  }, [isOpen, initialQuantity, reset]);

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
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Insira o usuário do responsável"
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
