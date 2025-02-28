"use client";

import Header from "@/components/header";
import { toast } from "@/components/ui/use-toast";
import DailyOpList from "@/features/daily-op-list";
import OpLoadForm from "@/features/op-load-form";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { validateOpJerpToProduce } from "@/usecases/op-jerp/validate-op-jerp-to-produce";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  function handleOpLoad(data: OpJerpDto) {
    try {
      validateOpJerpToProduce(data);
      redirectAction(`/op/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao Validar OP JERP",
        description: error?.message || error,
        variant: "warning"
      });
    }
  }

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="container flex flex-col gap-6 lg:gap-16">
        <h1 className="text-xl xl:text-4xl exl:text-8xl uppercase font-bold text-center">
          Insira o ID da OP
        </h1>
        <OpLoadForm onLoadOp={handleOpLoad} />
      </div>
      <DailyOpList />
    </div>
  );
}
