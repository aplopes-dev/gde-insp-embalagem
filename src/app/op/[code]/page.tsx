"use client";

import Header from "@/app/_components/header";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import OpDisplay from "../_components/op-display";
import { syncAndGetOpToProduceByCode } from "./actions";

import { ObjectValidation } from "@/types/validation";
import { io } from "socket.io-client";
import BoxDisplay from "../_components/box-display";

type OpSyncType = {
  quantityToProduce: number;
  quantityPerBlister: number;
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

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [data, setData] = useState<OpSyncType>();

  const [message, setMessage] = useState<ObjectValidation>();
  const [step, setStep] = useState(0); // 0 - box, 1 - blister, 2 - quantity, 3 - print
  const [quantityPerBlister, setQuantityPerBlister] = useState(0);

  const [boxesPending, setBoxesPending] = useState(0);
  const [itemPerBlister, setItemPerBlister] = useState(0);
  const [lastBlisterQuantity, setLastBlisterQuantity] = useState(0);

  const [displayMessage, setDisplayMessage] = useState("");
  const [displayColor, setDisplayColor] = useState<"blue" | "red" | "green">(
    "blue"
  );

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
    configBoxes(opData);
  };

  function configBoxes(opData: OpSyncType) {
    const { quantityToProduce: qtProduce, quantityPerBlister: qtPerBlister } =
      opData;
    const mod = qtProduce % qtPerBlister;
    const boxesToProduce = (qtProduce - mod) / qtPerBlister + (mod > 0 ? 1 : 0);
    const lastQuantity = mod > 0 ? mod : qtPerBlister;
    setQuantityPerBlister(qtPerBlister);
    setBoxesPending(boxesToProduce);
    setLastBlisterQuantity(lastQuantity);
  }

  function inspectBox(message: ObjectValidation) {
    if (message.type == "box") {
      if (message.code == `${data?.boxTypeId}`) {
        setDisplayMessage("Caixa válida");
        setDisplayColor("green");
      } else {
        setDisplayMessage("Modelo de caixa inválido.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira uma caixa.");
      setDisplayColor("red");
    }
  }

  function inspectBlister(message: ObjectValidation) {
    if (message.type == "blister") {
      if (message.code == `${data?.blisterTypeId}`) {
        setDisplayMessage("Blister válido");
        setDisplayColor("green");
      } else {
        setDisplayMessage("Modelo de blister inválido.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira um blister.");
      setDisplayColor("red");
    }
  }

  function inspectQuantity(message: ObjectValidation) {
    if (message.type == "product") {
      //TODO: Consider that the last blister may have different amounts
      if (message.count == quantityPerBlister) {
        setDisplayMessage("Blister válido");
        setDisplayColor("green");
      } else {
        setDisplayMessage("Modelo de blister inválido.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira produtos.");
      setDisplayColor("red");
    }
  }

  function printLabel() {}

  useEffect(() => {
    loadData().catch((err: Error) => {
      console.log(err);
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    });
  }, []);

  useEffect(() => {
    // if (data && data.status == 0) {
    if (data) {
      let socket: any;
      socket = io("http://localhost:3001");
      socket.on("notifyUser", (message: any) => {
        setMessage(message);
      });
      return () => {
        socket.off("notifyUser");
        socket.disconnect();
      };
    }
  }, [data]);

  useEffect(() => {
    if (message)
      switch (step) {
        case 0:
          inspectBox(message);
          break;
        case 1:
          inspectBlister(message);
          break;
        case 2:
          inspectQuantity(message);
          break;
        case 3:
          printLabel();
          break;
      }
  }, [message]);

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%] flex flex-col gap-4">
          {data && (
            <OpDisplay
              code={data.code}
              boxesCount={10}
              boxesPacked={2}
              displayMessage={displayMessage}
              displayColor={displayColor}
              statusMessage="Pendente"
              statusVariant="secondary"
              startDate={data.createdAt}
            />
          )}
          <BoxDisplay
            name="CX202"
            isTarget={step == 0}
            description="20x40x20cm"
            displayColor="blue"
            statusText="Pendente"
            statusVariant="secondary"
          />
        </div>
      </div>
      <pre>{JSON.stringify(message, null, 2)}</pre>
    </div>
  );
}
