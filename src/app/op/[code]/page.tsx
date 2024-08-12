"use client";

import Header from "@/app/_components/header";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import OpDisplay from "../_components/op-display";
import { syncAndGetOpToProduceByCode } from "./actions";

import { useOnMountUnsafe } from "@/hooks/use-on-mount-unsafe";
import { io } from "socket.io-client";

type OpSyncType = {
  quantityToProduce: number;
  blisterLimitPerBox: number;
  id: number;
  code: string;
  boxTypeId: number;
  blisterTypeId: number;
  productTypeId: number;
  status: number;
  createdAt: Date;
  updatedAt: Date;
};

type InspectionType = {
  datetime: Date;
  status: number;
  /* 
    1 - caixa inserida
    2 - caixa validada
    3 - blister inserido
    4 - blister aprovado
    5 - quantidade aprovada
    6 - etiqueta emitida
    7 - inspecao finalizada
    22 - caixa reprovada
    44 - blister reprovado
    55 - quantidade reprovada 
  */
};

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [inspections, setInspections] = useState<InspectionType[]>([]);
  const [data, setData] = useState<OpSyncType>();

  const [message, setMessage] = useState();

  const [displayMessage, setDisplayMessage] = useState("");
  const [displayColor, setDisplayColor] = useState<"blue" | "red">("blue");

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
  };

  useEffect(() => {
    loadData()
      .catch((err: Error) => {
        console.log(err);
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        });
      });
  }, []);

  useEffect(() => {
    if (data) {
      let socket: any;
      socket = io("http://localhost:3001");
      socket.on("notifyUser", (message: any) => {
        setMessage(message);
        if (!message) {
          setDisplayMessage("Insira a caixa");
        }
        if (inspections.length == 0) {
          if (message.type == "box") {
            setDisplayColor("blue");
            console.log(data);
            console.log(message.code, `${data?.boxTypeId}`);
            if (message.code == `${data?.boxTypeId}`) {
              setDisplayMessage("Caixa aprovada");
            } else {
              setDisplayMessage("Caixa incorreta");
            }
          } else {
            setDisplayMessage("Objeto inválido");
            setDisplayColor("red");
          }
        }
      });
      return () => {
        socket.off("notifyUser");
        socket.disconnect();
      };
    } 
  }, [data]);

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%]">
          {data && (
            <div>
              <OpDisplay
                code={data.code}
                displayMessage={displayMessage}
                displayColor={displayColor}
                statusMessage="Pendente"
                statusVariant="secondary"
                startDate={data.createdAt}
              />
            </div>
          )}
          <pre>{JSON.stringify(message, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
