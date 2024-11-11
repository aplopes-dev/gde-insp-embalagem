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
import { managarAuthorization } from "../actions";
import {
  opBreakAuthorizationSchema,
  OpBreakAuthorizationType,
} from "../schema";

type OpBreakAuthFormProps = {
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
}: OpBreakAuthFormProps) => {
  const form = useForm<OpBreakAuthorizationType>({
    resolver: zodResolver(opBreakAuthorizationSchema),
    defaultValues: {
      quantity: initialQuantity || 1,
      code: "",
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
    const { quantity, code, password } = data;
    await managarAuthorization(code, password)
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
      reset({ quantity: initialQuantity, code: "", password: "" });
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Insira o codigo do responsável"
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
