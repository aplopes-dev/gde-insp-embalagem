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
  finalizeAndRemovePendingRelationsByOpCode,
  persistBoxStatusWithBlisters,
  persistWithOpBreak,
  syncAndGetOpToProduceByCode,
} from "./actions";

type ActiveItemDto = {
  itemId: string;
  quantity?: number;
};

type DetectionDto = {
  itemId: string;
  count: number;
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
  const [data, setData] = useState<OpInspectionDto>();
  const [displayMessage, setDisplayMessage] = useState("");
  const [inspection, setInspection] = useState<ObjectValidation>();
  const [step, setStep] = useState(0); // 0 - box, 1 - blister, 2 - quantity, 3 - print
  const [openRestartDialog, setOpenRestartDialog] = useState<boolean>(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [openPrintTagDialog, setOpenPrintTagDialog] = useState<boolean>(false);
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

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
    setDisplayColor("blue");
    if (opData.finishedAt) {
      setDisplayMessage("OP Finalizada");
    } else if (opData.nextBox?.OpBoxBlister) {
      setDisplayMessage("");
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
      await sendMessageToRabbitMq({
        itemId: `${opData.productType.id}`,
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
        sendMessageToRabbitMq({
          itemId: `${data.blisterType.id}`,
          quantity: 1,
          model: `${data.blisterType.name}`,
        });
        setTargetBlister(0);
        setStep(1);
        box &&
          setBox({
            ...box,
            status: 1,
          });
        setDisplayMessage("Caixa válida");
        setDisplayColor("green");
      } else if (message.itemId != data?.boxType?.name) {
        setDisplayMessage("Modelo de caixa inválido.");
        setDisplayColor("blue");
        // Repeat box ref
        sendToIA({
          itemId: data!.boxType.name,
          quantity: 1,
        });
        sendMessageToRabbitMq({
          itemId: `${data!.boxType.id}`,
          quantity: 1,
          model: `${data!.boxType.name}`,
        });
      } else if (message.count != 1) {
        setDisplayMessage("Deve haver apenas uma caixa!");
        setDisplayColor("blue");
        // Repeat box ref
        sendToIA({
          itemId: data!.boxType.name,
          quantity: 1,
        });
        sendMessageToRabbitMq({
          itemId: `${data!.boxType.id}`,
          quantity: 1,
          model: `${data!.boxType.name}`,
        });
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira uma caixa.");
      setDisplayColor("red");
      // Repeat box ref
      sendToIA({
        itemId: data!.boxType.name,
        quantity: 1,
      });
      sendMessageToRabbitMq({
        itemId: `${data!.boxType.id}`,
        quantity: 1,
        model: `${data!.boxType.name}`,
      });
    }
  }

  function inspectBlister(message: ObjectValidation) {
    if (activeObjectType == "blister") {
      if (message.itemId == data?.blisterType.name && message.count == 1) {
        setDisplayMessage("Blister válido");
        setDisplayColor("green");
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
        sendMessageToRabbitMq({
          itemId: `${data!.productType.id}`,
          quantity: blisters[targetBlister!].quantity,
          model: `${data!.productType.name}`,
        });
        setStep(2);
      } else if (message.itemId != data?.blisterType.name) {
        setDisplayMessage("Modelo de blister inválido.");
        setDisplayColor("blue");
        // Repeat blister ref
        sendToIA({
          itemId: data!.blisterType.name,
          quantity: 1,
        });
        sendMessageToRabbitMq({
          itemId: `${data!.blisterType.id}`,
          quantity: 1,
          model: `${data!.blisterType.name}`,
        });
      } else if (message.count != 1) {
        setDisplayMessage("Deve haver apenas um blister!");
        setDisplayColor("blue");
        // Repeat blister ref
        sendToIA({
          itemId: data!.blisterType.name,
          quantity: 1,
        });
        sendMessageToRabbitMq({
          itemId: `${data!.blisterType.id}`,
          quantity: 1,
          model: `${data!.blisterType.name}`,
        });
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira um blister.");
      setDisplayColor("red");
      // Repeat blister ref
      sendToIA({
        itemId: data!.blisterType.name,
        quantity: 1,
      });
      sendMessageToRabbitMq({
        itemId: `${data!.blisterType.id}`,
        quantity: 1,
        model: `${data!.blisterType.name}`,
      });
    }
  }

  function inspectQuantity(message: ObjectValidation) {
    if (activeObjectType == "product") {
      const pendingQuantity = quantityInBox - checkedQuantity;
      if (message.itemId != data?.productType.name) {
        setDisplayMessage("Modelo de produto inválido.");
        setDisplayColor("blue");
        // Repeat product ref
        sendToIA({
          itemId: data!.productType.name,
          quantity: blisters[targetBlister!].quantity,
        });
        sendMessageToRabbitMq({
          itemId: `${data!.productType.id}`,
          quantity: blisters[targetBlister!].quantity,
          model: `${data!.productType.name}`,
        });
      } else if (
        (message.count == data!.blisterType.slots &&
          message.count <= pendingQuantity) ||
        message.count == pendingQuantity
      ) {
        setDisplayMessage("Blister válido");
        setDisplayColor("green");
        const index = targetBlister || 0;
        if (blisters[index + 1]) {
          setTargetBlister(index + 1);
          setActiveObjectType("blister");
          sendToIA({
            itemId: data!.blisterType.name,
            quantity: 1,
          });
          sendMessageToRabbitMq({
            itemId: `${data!.blisterType.id}`,
            quantity: 1,
            model: `${data!.blisterType.name}`,
          });
          setStep(1);
        } else {
          setTargetBlister(undefined);
          setActiveObjectType(undefined);
          setStep(3);
          setOpenConfirmDialog(true);
        }
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
        setDisplayMessage("Quantidade de itens incorreta.");
        setDisplayColor("blue");
        // Repeat product ref
        sendToIA({
          itemId: data!.productType.name,
          quantity: blisters[targetBlister!].quantity,
        });
        sendMessageToRabbitMq({
          itemId: `${data!.productType.id}`,
          quantity: blisters[targetBlister!].quantity,
          model: `${data!.productType.name}`,
        });
      }
    } else {
      setDisplayMessage("Tipo de objeto inválido. Insira produtos.");
      setDisplayColor("red");
      // Repeat product ref
      sendToIA({
        itemId: data!.productType.name,
        quantity: blisters[targetBlister!].quantity,
      });
      sendMessageToRabbitMq({
        itemId: `${data!.productType.id}`,
        quantity: blisters[targetBlister!].quantity,
        model: `${data!.productType.name}`,
      });
    }
  }

  async function persistBoxInspection() {
    if (box) {
      await persistBoxStatusWithBlisters(
        box,
        blisters,
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
      await printTag();
      await reload();
    }
  }

  async function reload() {
    await loadData();
    setTargetBlister(undefined);
    setStep(0);
  }

  async function printTag() {
    const productQuantity = blisters
      .filter((bl) => bl.status == 1)
      .reduce((acc, i) => acc + i.quantity, 0);
    setQuantityToPrint(productQuantity);
    setOpenPrintTagDialog(true);
  }

  async function forceOpFinalization(managerId: string) {
    const issetPackedBlister = blisters.find((bl) => bl.packedAt);
    const boxesPacked = Number(data?.totalBoxes) - Number(data?.pendingBoxes);

    if (boxesPacked == 0) {
      const issetValidBLister = blisters.find((bl) => bl.status == 1);
      if (box?.status != 1 || !issetValidBLister) {
        toast({
          title: "Erro",
          variant: "destructive",
          description:
            "Não é possível finalizar a operação, pois não há itens embalados",
        });
      } else {
        //TODO: Persist box, partial blisters and remove pending
        await persistWithOpBreak(box, blisters, data!.opId)
          .then((_) => {
            toast({
              title: "Sucesso",
              description: "Caixa finalizada com sucesso!",
            });
            printTag();
          })
          .catch((err) => {
            toast({
              title: "Erro",
              description: err.message,
              variant: "destructive",
            });
          });
        await reload();
      }
    } else {
      if (box?.status == 0) {
        await finalizeAndRemovePendingRelationsByOpCode(data!.opId)
          .then((_) => {
            toast({
              title: "Sucesso",
              description: "OP finalizada com sucesso!",
            });
          })
          .catch((err) => {
            toast({
              title: "Erro",
              description: err.message,
              variant: "destructive",
            });
          });
        await reload();
      } else if (box?.status == 1 && !issetPackedBlister) {
        toast({
          title: "Erro",
          variant: "destructive",
          description: "A caixa está vazia, insira ao menos um blister!",
        });
      } else {
        //TODO: Persist box, partial blisters and remove pending
        await persistWithOpBreak(box!, blisters, data!.opId)
          .then((_) => {
            toast({
              title: "Sucesso",
              description: "Caixa finalizada com sucesso!",
            });
            printTag();
          })
          .catch((err) => {
            toast({
              title: "Erro",
              description: err.message,
              variant: "destructive",
            });
          });
        await reload();
      }
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
        return "Quebra de OP";
      default:
        return "Pendente";
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
                    disabled={step != 3}
                    className="bg-green-700 hover:bg-green-600"
                    onClick={() => setOpenConfirmDialog(true)}
                  >
                    Finalizar e Imprimir
                  </Button>
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
      <ConfirmationDialog
        title="Finalizar Inspeção"
        message="Deseja confirmar a inspeção e imprimir a etiqueta?"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        confirmationAction={persistBoxInspection}
        onOpenChange={setOpenConfirmDialog}
        open={openConfirmDialog}
      />
      <ManagerAuthFormDialog
        title={"Autorizar quebra de OP"}
        message={
          "A OP será finalizada com os itens embalados até o momento. **ATENÇÃO** Essa ação não poderá ser desfeita."
        }
        isOpen={openForceFinalizationDialog}
        onOpenChange={setOpenForceFinalizationDialog}
        onManagerAuth={(managerId) => forceOpFinalization(managerId)}
      />
      {data && (
        <PrintTagDialog
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
