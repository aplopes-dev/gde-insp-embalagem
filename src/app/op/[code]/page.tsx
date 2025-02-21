"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import BlisterDisplay from "@/features/blister-display";
import ManagerAuthFormDialog from "@/features/manager-auth-form-dialog";
import BoxDisplay from "@/features/op-box-display";
import OpDisplay from "@/features/op-display";
import PrintTagDialog from "@/features/print-tag-dialog/ui";
import {
  sendMessageToRabbitMq,
  sendMessageToRabbitMqMobile,
} from "@/shared/services/rabbitmq";
import { ObjectValidation, ValidableType } from "@/types/validation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSocketDetection } from "@/hooks/use-socket-detection";
import { useSocketEmmiter } from "@/hooks/use-socket-emmiter";
import {
  InspectionEnum,
  objectInspection,
} from "@/shared/services/object-inspection";
import { ActionDto, DetectionDto } from "@/types/dtos/socket-detection-dto";
import { ObjectTypes } from "@/types/object-types";
import {
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../../../types/op-box-inspection-dto";
import {
  persistBoxStatusWithBlisters,
  persistWithOpBreak,
  syncAndGetOpToProduceByCode,
} from "./actions";

type DisplayColors = "blue" | "red" | "green" | "black";
const mobileColorKeysMap = new Map<string, number>([
  ["blue", 1],
  ["red", 2],
  ["green", 3],
  ["black", 4],
]);

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
  const [openPrintTagDialog, setOpenPrintTagDialog] = useState<boolean>(false);
  const [opBrakeManagerId, setOpBrakeManagerId] = useState<string>();
  const [openForceFinalizationDialog, setOpenForceFinalizationDialog] =
    useState<boolean>(false);

  const [targetBlister, setTargetBlister] = useState<number>();

  const [quantityInBox, setQuantityInBox] = useState<number>(0);
  const [checkedQuantity, setCheckedQuantity] = useState<number>(0);
  const [box, setBox] = useState<OpBoxInspectionDto>();
  const [blisters, setBlisters] = useState<OpBoxBlisterInspection[]>([]);
  const [displayColor, setDisplayColor] = useState<DisplayColors>("blue");
  const [quantityToPrint, setQuantityToPrint] = useState<number>(0);

  const [activeObjectType, setActiveObjectType] = useState<ValidableType>();

  const [blisterCodes, setBlisterCodes] = useState<string[]>([]);

  const { socket } = useSocketDetection({
    onDetectionUpdate: handleDetectionUpdate,
    onActionHandler: handleActionHandler,
  });

  const { sendSocketEvent } = useSocketEmmiter();

  function sendWithDelay(message: any, delay: number = 2000) {
    setTimeout(() => sendMessageToRabbitMq(message), delay);
  }

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code);
    setData(opData);
    setDisplayColor("blue");
    if (!opData) throw new Error("OP não retornada!");
    if (opData.finishedAt) {
      sendValidationMessage({
        message: "OP FINALIZADA!",
        color: "blue",
      });
    } else {
      mountInspecionState(opData.nextBox!, opData.blisterCodes);
      const message: string = "AGUARDANDO CAIXA...";
      const color: DisplayColors = "blue";
      const itemId: string | undefined = data?.boxType.name;
      const quantity: number = 1;
      sendValidationMessage({ message, color, itemId, quantity });
    }
  };

  useEffect(() => {
    socket && loadData();
  }, [socket]);

  function mountInspecionState(
    boxData: OpBoxInspectionDto,
    blisterCodesInUse: string[]
  ) {
    if (!boxData) throw Error("Falha ao carregar caixa");
    if (!boxData.OpBoxBlister) throw Error("Falha ao carregar blisters");
    if (!blisterCodesInUse) throw Error("Falha ao carregar blisters em uso");

    const itemQuantity = boxData.OpBoxBlister.reduce((total, blister) => {
      return total + blister.quantity;
    }, 0);

    const checkQuantity = boxData.OpBoxBlister?.filter(
      (bl) => bl.packedAt
    ).reduce((total, blister) => {
      return total + blister.quantity;
    }, 0);

    setBlisterCodes(blisterCodesInUse);
    setBlisters(boxData.OpBoxBlister);
    setQuantityInBox(itemQuantity);
    setCheckedQuantity(checkQuantity);
    setActiveObjectType("box");
    setBox(boxData);
  }

  function handleDetectionUpdate(data: DetectionDto) {
    sendSocketEvent("iaHandler", {
      receivedCount: data.count,
      receivedItemId: data.itemId,
    });
    if (data.itemId) {
      setInspection({
        itemId: data.itemId,
        count: Number(data.count),
        code: data.code,
      });
    }
  }

  function handleActionHandler(data: ActionDto) {
    console.log(
      "%c GLASSES:",
      "color: yellow;\n",
      data,
      "%c ------------------------------",
      "color: yellow;"
    );
    switch (data.action) {
      case "BREAK_OP":
        setOpenForceFinalizationDialog(true);
        break;
    }
  }

  useEffect(() => {
    if (!data?.finishedAt && inspection)
      switch (step) {
        case 0:
          boxInspection({
            ...inspection,
            type: activeObjectType,
          });
          break;
        case 1:
          blisterInspection({
            ...inspection,
            type: activeObjectType,
          });
          break;
        case 2:
          quantityInspection({
            ...inspection,
            type: activeObjectType,
          });
          break;
      }
  }, [inspection]);

  function boxInspection(inspection: ObjectValidation) {
    const inspectionData = objectInspection(
      ObjectTypes.box,
      data!.boxType.name,
      inspection,
      1
    );
    let message: string = "";
    let color: DisplayColors = "red";
    let itemId: string | undefined = data?.boxType.name;
    let quantity: number | undefined = undefined;
    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        message = "TIPO DE OBJETO INVÁLIDO. INSIRA UMA CAIXA.";
        quantity = 1;
        break;
      case InspectionEnum.TYPE_INVALID:
        message = "MODELO DE CAIXA INVÁLIDO.";
        break;
      case InspectionEnum.QUANTITY_INVALID:
        message = "DEVE HAVER UMA CAIXA!";
        quantity = 1;
        break;
      case InspectionEnum.VALID:
        message = "CAIXA VÁLIDA";
        color = "green";
        nextObjectValidation(inspection, ObjectTypes.blister);
        break;
    }
    sendValidationMessage({ message, color, itemId, quantity });
  }

  function blisterInspection(inspection: ObjectValidation) {
    const inspectionData = objectInspection(
      ObjectTypes.blister,
      data!.blisterType.name,
      inspection,
      1
    );
    let message: string = "";
    let color: DisplayColors = "red";
    let itemId: string | undefined = data?.blisterType.name;
    let quantity: number | undefined = undefined;
    let fileName: string | undefined = undefined;
    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        message = "TIPO DE OBJETO INVÁLIDO. INSIRA UM BLISTER.";
        quantity = 1;
        break;
      case InspectionEnum.TYPE_INVALID:
        message = "MODELO DE BLISTER INVÁLIDO.";
        break;
      case InspectionEnum.QUANTITY_INVALID:
        message = "DEVE HAVER UM BLISTER!";
        quantity = 1;
        break;
      case InspectionEnum.VALID:
        if (!inspection.code) {
          message = "ENVIE O CÓDIGO DO BLISTER.";
          quantity = 1;
        } else if (blisterCodes.includes(inspection.code)) {
          message = "ESTE BLISTER JÁ FOI EMBALADO, CODIGO:" + inspection.code;
          quantity = 1;
        } else {
          message = "BLISTER VÁLIDO";
          color = "green";
          quantity = blisters[targetBlister!].quantity;
          fileName = `OP_${data!.opCode}_BOX_${box?.code}_BL_${
            inspection.code
          }`;
          nextObjectValidation(inspection, ObjectTypes.product);
        }
        break;
    }
    sendValidationMessage({ message, color, quantity, itemId, fileName });
  }

  function quantityInspection(inspection: ObjectValidation) {
    const expectedQuantity = blisters[targetBlister!].quantity;
    const inspectionData = objectInspection(
      ObjectTypes.product,
      data!.productType.name,
      inspection,
      expectedQuantity
    );
    let message: string = "";
    let color: DisplayColors = "red";
    let itemId: string | undefined = data?.productType.name;
    let quantity: number | undefined = undefined;
    let fileName: string | undefined = undefined;
    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        message = "TIPO DE OBJETO INVÁLIDO. INSIRA PRODUTOS.";
        quantity = expectedQuantity;
        break;
      case InspectionEnum.TYPE_INVALID:
        message = "MODELO DE PRODUTO INVÁLIDO.";
        break;
      case InspectionEnum.QUANTITY_INVALID:
        message = "QUANTIDADE DE ITENS INCORRETA!";
        quantity = expectedQuantity;
        break;
      case InspectionEnum.VALID:
        message = "BLISTER E QUANTIDADE DE ITENS VÁLIDOS";
        color = "green";
        verifyNextBlisterOrFinalize(inspection);
        break;
    }
    sendValidationMessage({ message, color, quantity, itemId, fileName });
  }

  function sendValidationMessage(validation: {
    message: string;
    color: DisplayColors;
    quantity?: number;
    itemId?: string;
    fileName?: string;
  }) {
    setDisplayColor(validation.color);
    setDisplayMessage(validation.message);
    sendMessageToRabbitMqMobile({
      mensagem: validation.message,
      cor: mobileColorKeysMap.get(validation.color),
    });

    const filteredValidation = Object.entries(validation).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    sendSocketEvent("iaHandler", {
      ...filteredValidation,
    });
    sendWithDelay({
      ...filteredValidation,
    });
  }

  function nextObjectValidation(
    inspection: ObjectValidation,
    objectType: ObjectTypes
  ) {
    if (!data) throw Error("Falha ao carregar informações da OP");
    switch (objectType) {
      case ObjectTypes.blister:
        setActiveObjectType("blister");
        sendSocketEvent("iaHandler", {
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
        break;
      case ObjectTypes.product:
        if (!inspection.code) throw Error("Falha ao obter código da inspeção");
        const index = targetBlister || 0;
        setBlisters(
          blisters.map((bl, i) =>
            i == index
              ? { ...bl, code: inspection.code!, isValidItem: true }
              : bl
          )
        );
        setActiveObjectType("product");
        setBlisterCodes([...blisterCodes, inspection.code]);
        setStep(2);
        break;
    }
  }

  function verifyNextBlisterOrFinalize(inspection: ObjectValidation) {
    const index = targetBlister || 0;
    if (blisters[index + 1]) {
      setTargetBlister(index + 1);
      setActiveObjectType("blister");
      sendSocketEvent("iaHandler", {
        itemId: data!.blisterType.name,
        quantity: 1,
      });
      sendWithDelay({
        itemId: `${data!.blisterType.name}`,
        quantity: 1,
      });
      setStep(1);
      setCheckedQuantity(checkedQuantity + inspection.count);
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
      setCheckedQuantity(checkedQuantity + inspection.count);
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

  async function printTag(currentBlisters: OpBoxBlisterInspection[]) {
    setTimeout(() => {
      const productQuantity = currentBlisters
        .filter((bl) => bl.status == 1)
        .reduce((acc, i) => acc + i.quantity, 0);
      setQuantityToPrint(productQuantity);

      sendValidationMessage({
        message: "IMPRIMINDO ETIQUETA...",
        color: "black",
        quantity: 1,
        itemId: "TAG",
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

    if (quantity < blisters[index].quantity) {
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
    } else {
      sendValidationMessage({
        message: "QUANTIDADE DEVE SER MENOR QUE A ATUAL!",
        color: "red",
      });
    }
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <Header />
      {data && (
        <div className="flex-1 flex justify-center overflow-y-auto">
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
                <div>
                  <div className="flex justify-end gap-6 mt-8">
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
                      statusVariant={
                        getStatusVariant(box?.status) || "secondary"
                      }
                    />
                  </div>
                  <div className="mt-8 flex-1 overflow-y-auto">
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
                        <strong>Quantidade verificada:</strong>{" "}
                        {checkedQuantity}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
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
        </div>
      )}
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
      />
      {data && (
        <PrintTagDialog
          onPrintSuccess={() => {
            setTimeout(() => {
              sendValidationMessage({
                message: "CAIXA FINALIZADA COM SUCESSO!",
                color: "green",
              });
              redirectAction("/");
            }, 2000);
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
