"use client"

import Header from "@/components/header";
import { toast } from "@/components/ui/use-toast";
import DailyOpList from "@/modules/daily-op-list";
import OpLoadForm from "@/modules/op-load-form";
import { OpJerpDto } from "@/types/dtos/op-jerp-dto";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }
 
  function opIsValid(op?: OpJerpDto): boolean {
    if (!op || !op.quantidadeAProduzir || op.quantidadeAProduzir <= 0) {
      toast({
        title: "Alerta",
        description: "Não existem itens pendentes para embalagem",
      });
      return false;
    }
    return true;
  }

  function handleOpLoad(data: OpJerpDto) {
    if (opIsValid(data)) {
      redirectAction(`/op/${data.numero}`);
    }
  }

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="container flex flex-col gap-6 lg:gap-16">
        <h1 className="text-xl xl:text-4xl exl:text-8xl uppercase font-bold text-center">
          Digite o código da OP
        </h1>
        <OpLoadForm onLoadOp={handleOpLoad} />
      </div>
      <DailyOpList />
    </div>
  );
}
