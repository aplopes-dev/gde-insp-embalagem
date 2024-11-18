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
    sendMessageToRabbitMq(data)
  };

  async function sendMessageToRabbitMq(message: any) {
    console.log("%c FRONT:", "color: lightgreen;");
    console.log(message);
    console.log("%c ------------------------------", "color: lightgreen;");

    try {
      const res = await fetch("/api/send/back", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...message }),
      });

      if (!res.ok) {
        throw new Error(`Erro: ${res.status}`);
      }

      const data = await res.json();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  }


  const form = useForm<ValidationFormType>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      itemId: "",
      count: "",
      code: ""
    },
    mode: "onChange",
  });

  const {
    formState: { errors },
  } = form;

  const onSubmit = form.handleSubmit(async (data) => {
    const { itemId, count, code } = data;
    await sendNotification({
      itemId,
      count: Number(count),
      code
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
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input placeholder="Insira o código" {...field} />
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
