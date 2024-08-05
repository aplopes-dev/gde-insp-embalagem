"use client";

import Header from "@/app/_components/header";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import OpDisplay from "../_components/op-display";
import { syncAndGetOpToProduceByCode } from "./actions";

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [data, setData] = useState();

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
  };

  useEffect(() => {
    loadData().catch((err: Error) => {
      console.log(err);

      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    });
  }, []);

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%]">
          <OpDisplay
            code="123"
            displayMessage="Verificando caixa"
            displayColor="blue"
            statusMessage="Pendente"
            statusVariant="secondary"
            startDate={new Date()}
          />
        </div>
      </div>
    </div>
  );
}
