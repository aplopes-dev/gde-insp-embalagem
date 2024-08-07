"use client";

import Header from "@/app/_components/header";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import OpDisplay from "../_components/op-display";
import { syncAndGetOpToProduceByCode } from "./actions";

import { io } from "socket.io-client";

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [data, setData] = useState<any>(undefined);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
  };

  useEffect(() => {
    loadData().catch((err: Error) => {
      console.log(err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    });
    const socket = io("http://localhost:3001");
    socket.on("notifyUser", (message) => {
      setMessage(message);
      toast({
        title: "Nova",
        description: `${message}`,
      });
    });
    // Cleanup function to remove the event listener
    return () => {
      socket.off("notifyUser ");
      socket.disconnect();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%]">
          {data && (
            <OpDisplay
              code={data.code}
              displayMessage="Insira a caixa na esteira"
              displayColor="blue"
              statusMessage="Pendente"
              statusVariant="secondary"
              startDate={data.createdAt}
              endDate={data.packedAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}
