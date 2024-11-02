"use client";

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
      itemId: "",
      count: "",
    },
    mode: "onChange",
  });

  const {
    formState: { errors },
  } = form;

  const onSubmit = form.handleSubmit(async (data) => {
    const { itemId, count } = data;
    await sendNotification({
      itemId,
      count: Number(count),
    });
  });

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <FormField
          control={form.control}
          name="itemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID</FormLabel>
              <FormControl>
                <Input placeholder="Insira o ID" {...field} />
              </FormControl>
              <FormMessage>
                {errors.itemId && errors.itemId.message}
              </FormMessage>
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
              <FormMessage>{errors.count && errors.count.message}</FormMessage>
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
