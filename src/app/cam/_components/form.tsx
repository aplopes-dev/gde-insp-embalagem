"use client";

import { validableTypes } from "@/app/_data/validableTypes";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValidableType } from "@/types/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { io } from "socket.io-client";
import { ValidationFormType, validationSchema } from "../schema";

const CamForm = () => {
  const sendNotification = (data: any) => {
    const socket = io("http://localhost:3001");
    socket.emit("detectionUpdate", data);
  };

  const form = useForm<ValidationFormType>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "",
      count: "",
    },
    mode: "onChange",
  });

  const {
    formState: { errors },
  } = form;

  const onSubmit = form.handleSubmit(async (data) => {
    const { code, name, type } = data;
    await sendNotification({
      type: type as ValidableType,
      code,
      count: Number(data.count),
    });
  });

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input placeholder="Insira o código" {...field} />
              </FormControl>
              <FormMessage>{errors.code && errors.code.message}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {validableTypes.map((opt) => (
                      <SelectItem key={opt.value} value={`${opt.value}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input placeholder="Insira a quantidade" {...field} />
              </FormControl>
              <FormMessage>{errors.code && errors.code.message}</FormMessage>
            </FormItem>
          )}
        />
        <div className="mt-4 gap-2 flex justify-end">
          <Button
            type="submit"
            disabled={
              !form.formState.isDirty ||
              !form.formState.isValid ||
              form.formState.isSubmitting
            }
          >
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CamForm;
