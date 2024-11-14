"use client";

import Header from "@/app/_components/header";
import ConfirmationDialog from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { ObjectValidation, ValidableType } from "@/types/validation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import BlisterDisplay from "../_components/blister-display";
import BoxDisplay from "../_components/box-display";
import OpDisplay from "../_components/op-display";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../types/op-box-inspection-dto";
import ManagerAuthFormDialog from "./_components/manager-auth-form-dialog";
import PrintTagDialog from "./_components/print-tag-dialog";
import {
  persistBoxStatusWithBlisters,
  persistWithOpBreak,
  syncAndGetOpToProduceByCode,
} from "./actions";
import { useRouter } from "next/navigation";

type ActiveItemDto = {
  itemId: string;
  quantity?: number;
};

type DetectionDto = {
  itemId: string;
  count: number;
};

type ActionDto = {
  action: "BREAK_OP";
  params: any;
};

type DetectionReceivedDto = {
  receivedItemId: string;
  receivedCount: number;
};

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const router = useRouter();
  const [data, setData] = useState<OpInspectionDto>();
  const [displayMessage, setDisplayMessage] = useState("");
  const [inspection, setInspection] = useState<ObjectValidation>();
  const [step, setStep] = useState(0); // 0 - box, 1 - blister, 2 - quantity, 3 - print
  const [openRestartDialog, setOpenRestartDialog] = useState<boolean>(false);
  const [openPrintTagDialog, setOpenPrintTagDialog] = useState<boolean>(false);
  const [opBrakeManagerId, setOpBrakeManagerId] = useState<string>();
  const [openForceFinalizationDialog, setOpenForceFinalizationDialog] =
    useState<boolean>(false);

  const [targetBlister, setTargetBlister] = useState<number>();

  const [quantityInBox, setQuantityInBox] = useState<number>(0);
  const [checkedQuantity, setCheckedQuantity] = useState<number>(0);
  const [box, setBox] = useState<OpBoxInspectionDto>();
  const [blisters, setBlisters] = useState<OpBoxBlisterInspection[]>([]);
  const [displayColor, setDisplayColor] = useState<"blue" | "red" | "green">(
    "blue"
  );
  const [quantityToPrint, setQuantityToPrint] = useState<number>(0);

  const [activeObjectType, setActiveObjectType] = useState<ValidableType>();

  const sendToIA = (data: ActiveItemDto) => {
    const socket = io("http://localhost:3001");
    socket.emit("iaHandler", data);
  };

  const sendDetectionReceived = (data: DetectionReceivedDto) => {
    const socket = io("http://localhost:3001");
    socket.emit("iaHandler", data);
  };

  async function sendMessageToRabbitMq(message: any) {
    console.log("%c FRONT:", "color: lightgreen;");
    console.log(message);
    console.log("%c ------------------------------", "color: lightgreen;");

    try {
      const res = await fetch("/api/send", {
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

  async function sendMessageToRabbitMqMobile(message: any) {
    console.log("%c MOBILE:", "color: lightblue;");
    console.log(message);
    console.log("%c ------------------------------", "color: lightblue;");

    try {
      const res = await fetch("/api/send/mobile", {
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

  function sendWithDelay(message: any, delay: number = 2000) {
    console.log("SENDING");

    setTimeout(() => sendMessageToRabbitMq(message), delay);
  }

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
    setDisplayColor("blue");
    if (opData.finishedAt) {
      setDisplayMessage("OP FINALIZADA");
      sendMessageToRabbitMqMobile({
        mensagem: "OP FINALIZADA",
        cor: 1,
      });
    } else if (opData.nextBox?.OpBoxBlister) {
      setDisplayMessage("AGUARDANDO CAIXA...");
      sendMessageToRabbitMqMobile({
        mensagem: "AGUARDANDO CAIXA...",
        cor: 1,
      });
      setBlisters(opData.nextBox?.OpBoxBlister);
      const itemQuantity = opData.nextBox.OpBoxBlister.reduce(
        (total, blister) => total + blister.quantity,
        0
      );
      const checkQuantity =
        opData.nextBox.OpBoxBlister?.filter((bl) => bl.packedAt).reduce(
          (total, blister) => total + blister.quantity,
          0
        ) || 0;
      setQuantityInBox(itemQuantity);
      setCheckedQuantity(checkQuantity);
      delete opData["nextBox"]["OpBoxBlister"];
      setBox(opData.nextBox);
      //SEND: BOX
      setActiveObjectType("box");
      sendToIA({
        itemId: `${opData.productType.name}`,
      });
      sendWithDelay({
        itemId: `${opData.boxType.name}`,
        quantity: 1,
        model: `${opData.productType.name}`,
      });
    }
  };

  useEffect(() => {
    let socket: any;
    loadData()
      .then((_) => {
        socket = io("http://localhost:3001");
        socket.on("detectionUpdate", (message: DetectionDto) => {
          console.log("%c BACK:", "color: orange;");
          console.log(message);
          console.log("%c ------------------------------", "color: orange;");

          sendDetectionReceived({
            receivedCount: message.count,
            receivedItemId: message.itemId,
          });
          if (message.itemId) {
            setInspection({
              itemId: message.itemId,
              count: Number(message.count),
            });
          }
        });
        socket.on("actionHandler", (message: ActionDto) => {
          console.log("%c GLASSES:", "color: yellow;");
          console.log(message);
          console.log("%c ------------------------------", "color: yellow;");
          switch (message.action) {
            case "BREAK_OP":
              setOpenForceFinalizationDialog(true);
              break;
          }
        });
      })
      .catch((err: Error) => {
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        });
      });
    return () => {
      socket?.off("detectionUpdate");
      socket?.off("actionHandler");
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!data?.finishedAt && inspection)
      switch (step) {
        case 0:
          inspectBox(inspection);
          break;
        case 1:
          inspectBlister(inspection);
          break;
        case 2:
          inspectQuantity(inspection);
          break;
      }
  }, [inspection]);

  function inspectBox(message: ObjectValidation) {
    if (activeObjectType == "box") {
      if (message.itemId == data?.boxType?.name && message.count == 1) {
        setActiveObjectType("blister");
        sendToIA({
          itemId: data.blisterType.name,
          quantity: 1,
        });
        sendWithDelay({
          itemId: `${data.blisterType.name}`,
          quantity: 1,
        });
        setTargetBlister(0);
        setStep(1);
        box &&
          setBox({
            ...box,
            status: 1,
          });
        setDisplayMessage("CAIXA VÁLIDA");
        setDisplayColor("green");
        sendMessageToRabbitMqMobile({
          mensagem: "CAIXA VÁLIDA",
          cor: 3,
        });
      } else if (message.itemId != data?.boxType?.name) {
        setDisplayMessage("MODELO DE CAIXA INVÁLIDO.");
        setDisplayColor("red");
        sendMessageToRabbitMqMobile({
          mensagem: "MODELO DE CAIXA INVÁLIDO.",
          cor: 2,
        });
        // Repeat box ref
        sendToIA({
          itemId: data!.boxType.name,
          quantity: 1,
        });
        sendWithDelay({
          itemId: `${data!.boxType.name}`,
          quantity: 1,
        });
      } else if (message.count != 1) {
        setDisplayMessage("DEVE HAVER UMA CAIXA!");
        setDisplayColor("red");
        sendMessageToRabbitMqMobile({
          mensagem: "DEVE HAVER UMA CAIXA!",
          cor: 2,
        });
        // Repeat box ref
        sendToIA({
          itemId: data!.boxType.name,
          quantity: 1,
        });
        sendWithDelay({
          itemId: `${data!.boxType.name}`,
          quantity: 1,
        });
      }
    } else {
      setDisplayMessage("TIPO DE OBJETO INVÁLIDO. INSIRA UMA CAIXA.");
      setDisplayColor("red");
      sendMessageToRabbitMqMobile({
        mensagem: "TIPO DE OBJETO INVÁLIDO. INSIRA UMA CAIXA.",
        cor: 2,
      });
      // Repeat box ref
      sendToIA({
        itemId: data!.boxType.name,
        quantity: 1,
      });
      sendWithDelay({
        itemId: `${data!.boxType.name}`,
        quantity: 1,
      });
    }
  }

  function inspectBlister(message: ObjectValidation) {
    if (activeObjectType == "blister") {
      if (message.itemId == data?.blisterType.name && message.count == 1) {
        setDisplayMessage("BLISTER VÁLIDO");
        setDisplayColor("green");
        sendMessageToRabbitMqMobile({
          mensagem: "BLISTER VÁLIDO",
          cor: 3,
        });
        const index = targetBlister || 0;
        setBlisters(
          blisters.map((bl, i) =>
            i == index ? { ...bl, isValidItem: true } : bl
          )
        );
        setActiveObjectType("product");
        sendToIA({
          itemId: data!.productType.name,
          quantity: blisters[targetBlister!].quantity,
        });
        sendWithDelay({
          itemId: `${data!.productType.name}`,
          quantity: blisters[targetBlister!].quantity,
        });
        setStep(2);
      } else if (message.itemId != data?.blisterType.name) {
        setDisplayMessage("MODELO DE BLISTER INVÁLIDO.");
        setDisplayColor("red");
        sendMessageToRabbitMqMobile({
          mensagem: "MODELO DE BLISTER INVÁLIDO.",
          cor: 2,
        });
        // Repeat blister ref
        sendToIA({
          itemId: data!.blisterType.name,
          quantity: 1,
        });
        sendWithDelay({
          itemId: `${data!.blisterType.name}`,
          quantity: 1,
        });
      } else if (message.count != 1) {
        setDisplayMessage("DEVE HAVER UM BLISTER!");
        setDisplayColor("red");
        sendMessageToRabbitMqMobile({
          mensagem: "DEVE HAVER UM BLISTER!",
          cor: 2,
        });
        // Repeat blister ref
        sendToIA({
          itemId: data!.blisterType.name,
          quantity: 1,
        });
        sendWithDelay({
          itemId: `${data!.blisterType.name}`,
          quantity: 1,
        });
      }
    } else {
      setDisplayMessage("TIPO DE OBJETO INVÁLIDO. INSIRA UM BLISTER.");
      setDisplayColor("red");
      sendMessageToRabbitMqMobile({
        mensagem: "TIPO DE OBJETO INVÁLIDO. INSIRA UM BLISTER.",
        cor: 2,
      });
      // Repeat blister ref
      sendToIA({
        itemId: data!.blisterType.name,
        quantity: 1,
      });
      sendWithDelay({
        itemId: `${data!.blisterType.name}`,
        quantity: 1,
      });
    }
  }

  function inspectQuantity(message: ObjectValidation) {
    if (activeObjectType == "product") {
      const pendingQuantity = quantityInBox - checkedQuantity;
      if (message.itemId != data?.productType.name) {
        setDisplayMessage("MODELO DE PRODUTO INVÁLIDO.");
        setDisplayColor("red");
        sendMessageToRabbitMqMobile({
          mensagem: "MODELO DE PRODUTO INVÁLIDO.",
          cor: 2,
        });
        // Repeat product ref
        sendToIA({
          itemId: data!.productType.name,
          quantity: blisters[targetBlister!].quantity,
        });
        sendWithDelay({
          itemId: `${data!.productType.name}`,
          quantity: blisters[targetBlister!].quantity,
        });
      } else if (
        (message.count == data!.blisterType.slots &&
          message.count <= pendingQuantity) ||
        message.count == pendingQuantity
      ) {
        setDisplayMessage("BLISTER E QUANTIDADE DE ITENS VÁLIDOS");
        setDisplayColor("green");
        sendMessageToRabbitMqMobile({
          mensagem: "BLISTER E QUANTIDADE DE ITENS VÁLIDOS",
          cor: 3,
        });

        const index = targetBlister || 0;
        if (blisters[index + 1]) {
          setTargetBlister(index + 1);
          setActiveObjectType("blister");
          sendToIA({
            itemId: data!.blisterType.name,
            quantity: 1,
          });
          sendWithDelay({
            itemId: `${data!.blisterType.name}`,
            quantity: 1,
          });
          setStep(1);
          setCheckedQuantity(checkedQuantity + message.count);
          setBlisters(
            blisters.map((bl, i) =>
              i == index
                ? {
                    ...bl,
                    isValidQuantity: true,
                    status: 1,
                    packedAt: new Date(),
                  }
                : bl
            )
          );
        } else {
          setTargetBlister(undefined);
          setActiveObjectType(undefined);
          setStep(3);
          setCheckedQuantity(checkedQuantity + message.count);
          const updateBlisters = blisters.map((bl, i) =>
            i == index
              ? {
                  ...bl,
                  isValidQuantity: true,
                  status: 1,
                  packedAt: new Date(),
                }
              : bl
          );
          setBlisters(updateBlisters);
          opBrakeManagerId
            ? forceOpFinalization(opBrakeManagerId, updateBlisters)
            : persistBoxInspection(updateBlisters);
        }
      } else {
        setDisplayMessage("QUANTIDADE DE ITENS INCORRETA.");
        setDisplayColor("red");
        sendMessageToRabbitMqMobile({
          mensagem: "QUANTIDADE DE ITENS INCORRETA.",
          cor: 2,
        });
        // Repeat product ref
        sendToIA({
          itemId: data!.productType.name,
          quantity: blisters[targetBlister!].quantity,
        });
        sendWithDelay({
          itemId: `${data!.productType.name}`,
          quantity: blisters[targetBlister!].quantity,
        });
      }
    } else {
      setDisplayMessage("TIPO DE OBJETO INVÁLIDO. INSIRA PRODUTOS.");
      setDisplayColor("red");
      sendMessageToRabbitMqMobile({
        mensagem: "TIPO DE OBJETO INVÁLIDO. INSIRA PRODUTOS.",
        cor: 2,
      });
      // Repeat product ref
      sendToIA({
        itemId: data!.productType.name,
        quantity: blisters[targetBlister!].quantity,
      });
      sendWithDelay({
        itemId: `${data!.productType.name}`,
        quantity: blisters[targetBlister!].quantity,
      });
    }
  }

  async function persistBoxInspection(
    currentBlisters: OpBoxBlisterInspection[]
  ) {
    if (box) {
      await persistBoxStatusWithBlisters(
        box,
        currentBlisters,
        data!.opId,
        data?.pendingBoxes == 1
      )
        .then((_) => {
          toast({
            title: "Sucesso",
            description: "Inspeção de caixa finalizada com sucesso!",
          });
        })
        .catch((err) => {
          toast({
            title: "Erro",
            description: err.message,
            variant: "destructive",
          });
        });
      await printTag(currentBlisters);
    }
  }

  async function reload() {
    await loadData();
    setTargetBlister(undefined);
    setStep(0);
  }

  async function printTag(currentBlisters: OpBoxBlisterInspection[]) {
    setTimeout(() => {
      const productQuantity = currentBlisters
        .filter((bl) => bl.status == 1)
        .reduce((acc, i) => acc + i.quantity, 0);
      setQuantityToPrint(productQuantity);
      sendMessageToRabbitMqMobile({
        mensagem: "IMPRIMINDO ETIQUETA...",
        cor: 4,
      });
      setOpenPrintTagDialog(true);
    }, 2000);
  }

  async function forceOpFinalization(
    managerId: string,
    currentBlisters: OpBoxBlisterInspection[]
  ) {
    const issetPackedBlister = currentBlisters.find((bl) => bl.packedAt);

    if (box?.status != 1 || !issetPackedBlister) {
      toast({
        title: "Erro",
        variant: "destructive",
        description:
          "Não é possível finalizar a operação, pois não há itens embalados",
      });
    } else {
      //TODO: Persist box, partial blisters and remove pending
      await persistWithOpBreak(
        box,
        currentBlisters,
        data!.opId,
        Number(managerId)
      )
        .then((_) => {
          toast({
            title: "Sucesso",
            description: "Caixa finalizada com sucesso!",
          });
          printTag(currentBlisters);
        })
        .catch((err) => {
          toast({
            title: "Erro",
            description: err.message,
            variant: "destructive",
          });
        });
    }
  }

  function getStatusVariant(status?: number) {
    switch (status) {
      case 1:
        return "success";
      case 2:
        return "destructive";
      default:
        return "secondary";
    }
  }

  function getStatusName(status?: number) {
    switch (status) {
      case 1:
        return "Concluído";
      case 2:
        return "Quebra de Caixa";
      default:
        return "Pendente";
    }
  }

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  function configLastBlisterQuantity(quantity: number, managerId: string) {
    const index = targetBlister || 0;

    if(quantity < blisters[index].quantity){
      const newBlisters = [...blisters.slice(0, index + 1)];
      newBlisters[index].quantity = quantity;
  
      const itemQuantity = newBlisters.reduce(
        (total, blister) => total + blister.quantity,
        0
      );
      const checkQuantity =
        newBlisters
          ?.filter((bl) => bl.packedAt)
          .reduce((total, blister) => total + blister.quantity, 0) || 0;
  
  
      setQuantityInBox(itemQuantity);
      setCheckedQuantity(checkQuantity);
      setBlisters(newBlisters);
      setOpBrakeManagerId(managerId);
    }else{
      setDisplayMessage("QUANTIDADE DEVE SER MENOR QUE A ATUAL!");
      setDisplayColor("red");
      sendMessageToRabbitMqMobile({
        mensagem: "QUANTIDADE DEVE SER MENOR QUE A ATUAL!",
        cor: 2,
      });
    }

  }

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="flex justify-center">
        {data && (
          <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%] flex flex-col">
            <OpDisplay
              code={data.opCode}
              boxesCount={data.totalBoxes}
              boxesPacked={data.totalBoxes - data.pendingBoxes}
              itemsCount={data.quantityToProduce}
              itemsPacked={data.itemsPacked}
              displayMessage={displayMessage}
              displayColor={displayColor}
              statusMessage={getStatusName(data?.status) || ""}
              statusVariant={getStatusVariant(data?.status) || "secondary"}
              startDate={data?.createdAt || new Date()}
              endDate={data?.finishedAt}
            />
            {!data.finishedAt && (
              <>
                <div className="flex justify-end gap-6 mt-8">
                  <Button
                    className="bg-blue-700 hover:bg-blue-600"
                    onClick={() => setOpenRestartDialog(true)}
                  >
                    Reiniciar inspeção da caixa
                  </Button>
                  <Button
                    className="bg-red-700 hover:bg-red-600"
                    variant={"destructive"}
                    onClick={() => setOpenForceFinalizationDialog(true)}
                  >
                    Finalizar com quebra
                  </Button>
                </div>
                <div className="mt-2">
                  <h3 className="font-bold uppercase">Caixa</h3>
                  <BoxDisplay
                    name={data.boxType.name}
                    isTarget={step == 0}
                    description={data.boxType.description}
                    displayColor="blue"
                    statusText={getStatusName(box?.status) || ""}
                    statusVariant={getStatusVariant(box?.status) || "secondary"}
                  />
                </div>
                <div className="mt-8">
                  <div className="flex gap-4">
                    <div>
                      <strong>Blister:</strong> {data.blisterType.name}
                    </div>
                    <div>
                      <strong>Item:</strong> {data.productType.name}
                    </div>
                    <div>
                      <strong>Quantidade na Caixa:</strong> {quantityInBox}
                    </div>
                    <div>
                      <strong>Quantidade verificada:</strong> {checkedQuantity}
                    </div>
                  </div>
                </div>
                <div className="mt-8">
                  <h3 className="font-bold uppercase">Embalagem</h3>
                  <BlisterDisplay
                    blisterName={data.blisterType.name}
                    itemName={data.productType.name}
                    blisters={blisters}
                    targetIndex={targetBlister}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <ConfirmationDialog
        title="Reiniciar Inspeção"
        message="Deseja realmente reiniciar a inspeção desta caixa?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={reload}
        onOpenChange={setOpenRestartDialog}
        open={openRestartDialog}
      />
      <ManagerAuthFormDialog
        title={"Autorizar quebra de Caixa"}
        message={
          "A caixa será finalizada com os itens embalados até o momento. **ATENÇÃO** Essa ação não poderá ser desfeita."
        }
        isOpen={openForceFinalizationDialog}
        initialQuantity={inspection?.count}
        onOpenChange={setOpenForceFinalizationDialog}
        onManagerAuth={(quantity, managerId) =>
          configLastBlisterQuantity(quantity, managerId)
        }
        // onManagerAuth={(managerId) => forceOpFinalization(managerId)}
      />
      {data && (
        <PrintTagDialog
          onPrintSuccess={() => {
            setTimeout(() => {
              sendMessageToRabbitMqMobile({
                mensagem: "CAIXA FINALIZADA COM SUCESSO!",
                cor: 3,
              });
              redirectAction("/");
            }, 2000);
              // issetNextBox ? reload() : redirectAction("/");
          }}
          itemName={data.productType.name}
          itemDescription={data.productType.description}
          opId={data.opId}
          quantity={quantityToPrint}
          batchCode={data.opCode}
          isOpen={openPrintTagDialog}
          onOpenChange={setOpenPrintTagDialog}
        />
      )}
    </div>
  );
}
