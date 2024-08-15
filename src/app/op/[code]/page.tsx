"use client";

import Header from "@/app/_components/header";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import OpDisplay from "../_components/op-display";
import { syncAndGetOpToProduceByCode } from "./actions";

import { ObjectValidation } from "@/types/validation";
import { io } from "socket.io-client";
import BlisterDisplay from "../_components/blister-display";
import BoxDisplay from "../_components/box-display";
import { OpBoxBlisterInspection } from "../types/op-box-inspection-dto";

const mockBlister = [
  {
    code: "001",
    isValidItem: false,
    isValidQuantity: false,
    quantity: 10,
    status: "PENDING",
  },
  {
    code: "002",
    isValidItem: false,
    isValidQuantity: false,
    quantity: 10,
    status: "PENDING",
  },
  {
    code: "003",
    isValidItem: false,
    isValidQuantity: false,
    quantity: 10,
    status: "PENDING",
  },
  {
    code: "004",
    isValidItem: false,
    isValidQuantity: false,
    quantity: 10,
    status: "PENDING",
  },
  {
    code: "005",
    isValidItem: false,
    isValidQuantity: false,
    quantity: 10,
    status: "PENDING",
  },
  {
    code: "006",
    isValidItem: false,
    isValidQuantity: false,
    quantity: 6,
    status: "PENDING",
  },
];

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
  const [blisters, setBlisters] = useState<OpBoxBlisterInspection[]>([]);
  const [boxStatus, setBoxStatus] = useState("PENDING");

  const [message, setMessage] = useState<ObjectValidation>();
  const [step, setStep] = useState(0); // 0 - box, 1 - blister, 2 - quantity, 3 - print
  const [quantityPerBlister, setQuantityPerBlister] = useState(5);
  const [targetBlister, setTargetBlister] = useState<number>();

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
    // setQuantityPerBlister(qtPerBlister);
    setBoxesPending(boxesToProduce);
    setLastBlisterQuantity(lastQuantity);
    setBlisters(mockBlister);
  }

  function inspectBox(message: ObjectValidation) {
    if (message.type == "box") {
      if (message.code == `${data?.boxTypeId}`) {
        setStep(1);
        setBoxStatus("APPROVED");
        setTargetBlister(0);
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
        const index = targetBlister || 0;
        setBlisters(
          blisters.map((bl, i) =>
            i == index ? { ...bl, isValidItem: true } : bl
          )
        );
        setStep(2);
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
        const index = targetBlister || 0;
        setTargetBlister(index + 1);
        setStep(1);
        setBlisters(
          blisters.map((bl, i) =>
            i == index
              ? { ...bl, isValidQuantity: true, status: "APPROVED" }
              : bl
          )
        );
      } else {
        setDisplayMessage("Quantidade de itens incorreta.");
        setDisplayColor("blue");
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira produtos.");
      setDisplayColor("red");
    }
  }
  function printLabel() {}

  function getStatusColor(status: string) {
    switch (status) {
      case "PENDING":
        return "gray";
      case "APPROVED":
        return "green";
      case "DISAPPROVED":
        return "red";
    }
  }

  function getStatusVariant(status: string) {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "APPROVED":
        return "success";
      case "DISAPPROVED":
        return "destructive";
    }
  }

  function getStatusName(status: string) {
    switch (status) {
      case "PENDING":
        return "Pendente";
      case "APPROVED":
        return "Aprovado";
      case "DISAPPROVED":
        return "Reprovado";
    }
  }

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
    console.log("step:", step);
    console.log("targetBlister:", targetBlister);
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
        <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%] flex flex-col gap-8">
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
          <div>
            <h3 className="font-bold uppercase">Caixa</h3>
            <BoxDisplay
              name="CX202"
              isTarget={step == 0}
              description="20x40x20cm"
              displayColor="blue"
              statusText={getStatusName(boxStatus) || ""}
              statusVariant={getStatusVariant(boxStatus) || "secondary"}
            />
          </div>
          <div>
            <div className="flex gap-4">
              <div>
                <strong>Blister:</strong> BLF042
              </div>
              <div>
                <strong>Item:</strong> L-FSD-LE-042
              </div>
              <div>
                <strong>Quantidade na OP:</strong> 56
              </div>
              <div>
                <strong>Quantidade verificada:</strong> 20
                {/* <strong>Quantidade verificada:</strong> {verifiedQuantity} */}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold uppercase">Embalagem</h3>
            <BlisterDisplay blisters={blisters} targetIndex={targetBlister} />
          </div>
        </div>
      </div>
      <pre>{JSON.stringify(message, null, 2)}</pre>
    </div>
  );
}
