"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import BlisterDisplay from "@/features/blister-display";
import ManagerAuthFormDialog from "@/features/manager-auth-form-dialog";
import BoxDisplay from "@/features/op-box-display";
import OpDisplay from "@/features/op-display";
import PrintTagDialog from "@/features/print-tag-dialog/ui";
import SupervisorPieceConfigDialog from "@/features/supervisor-piece-config-dialog/ui";
import {
  sendMessageToRabbitMq,
  sendMessageToRabbitMqMobile,
} from "@/shared/services/rabbitmq";
import { ObjectValidation, ValidableType } from "@/types/validation";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSocketDetection } from "@/hooks/use-socket-detection";
import { useSocketEmmiter } from "@/hooks/use-socket-emmiter";
import {
  InspectionEnum,
  objectInspection,
} from "@/shared/services/object-inspection";
import { ActionDto, DetectionDto } from "@/types/dtos/socket-detection-dto";
import { ObjectTypes } from "@/types/object-types";
import { OpStatus } from "@prisma/client";
import { FileText, Loader2 } from "lucide-react";
import {
  InspectionStatus,
  OpBoxBlisterInspection,
  OpBoxInspectionDto,
  OpInspectionDto,
} from "../../../types/op-box-inspection-dto";
import {
  opCompletionNowHandler,
  persistBoxStatusWithBlisters,
  persistWithOpBreak,
  syncAndGetOpToProduceById,
} from "./actions";

// Types

type DisplayColors = "blue" | "red" | "green" | "black" | "yellow";

// Maps
const mobileColorKeysMap = new Map<string, number>([
  ["blue", 1],
  ["red", 2],
  ["green", 3],
  ["black", 4],
  ["yellow", 5],
]);

import RequireAuth from "@/components/require-auth";

export default function PackagingInspection({
  params: { opId },
}: {
  params: { opId: string };
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const router       = useRouter();
  const searchParams = useSearchParams();
  // deviceId vem do ?deviceId= (página de seleção) ou do env build-time
  const deviceId = searchParams.get("deviceId") ?? undefined;

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
  const [barcodeToPrint, setBarcodeToPrint] = useState<number>();
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const [openSupervisorConfigDialog, setOpenSupervisorConfigDialog] = useState<boolean>(false);
  const [supervisorConfigured, setSupervisorConfigured] = useState<boolean>(false);
  const [pendingInspection, setPendingInspection] = useState<ObjectValidation | undefined>(undefined);

  const [activeObjectType, setActiveObjectType] = useState<ValidableType>();
  const [blisterCodes, setBlisterCodes] = useState<string[]>([]);
  const pendingValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidationKeyRef = useRef<string>("");
  const lastValidationSentAtRef = useRef<number>(0);

  const { socket } = useSocketDetection({
    deviceId,
    onDetectionUpdate: handleDetectionUpdate,
    onActionHandler: handleActionHandler,
  });
  const { sendSocketEvent } = useSocketEmmiter();

  function sendWithDelay(message: any, delay: number = 2000) {
    if (pendingValidationTimerRef.current) {
      clearTimeout(pendingValidationTimerRef.current);
    }
    pendingValidationTimerRef.current = setTimeout(() => {
      sendMessageToRabbitMq(message);
      pendingValidationTimerRef.current = null;
    }, delay);
  }

  const loadData = async () => {
    syncAndGetOpToProduceById(opId)
      .then((opData) => {
        setData(opData);
        setDisplayColor("blue");

        if (!opData) throw new Error("OP não retornada!");

        // Exibe alerta para OP nova
        if (opData?.isNewOp) {
          if (opData?.requiresSupervisorConfig) {
            setVisorMessage("VERIFIQUE A QUANTIDADE DE PEÇAS E BLISTER POR CAIXA", "yellow");
            // Abre o dialog imediatamente junto com o alerta
            setOpenSupervisorConfigDialog(true);
          } else {
            setVisorMessage("OP NOVA", "yellow");
            // Aguarda 3 segundos antes de continuar com o fluxo normal
            setTimeout(() => {
              continueLoadingFlow(opData);
            }, 3000);
          }
        } else {
          continueLoadingFlow(opData);
        }

        setLoading(false);
      })
      .catch((error) => {
        setVisorMessage(error?.message || "Falha na sincronização da OP", "red");
        setLoading(false);
      });
  };

  const continueLoadingFlow = (opData: OpInspectionDto) => {
    if (opData?.requiresSupervisorConfig) {
      setOpenSupervisorConfigDialog(true);
      // Não altera a mensagem do visor se já está mostrando alerta de OP nova
      return;
    }

    if (opData.finishedAt) {
      setVisorMessage("OP FINALIZADA!", "blue");
    } else if (!opData.nextBox) {
      setVisorMessage("NÃO EXISTEM CAIXAS PENDENTES!", "blue");
    } else {
      mountInspecionState(opData.nextBox!, opData.blisterCodes);

      const itemId: string | undefined = opData?.boxType.name;
      const model: string | undefined = opData?.productType.name;
      const quantity: number = 1;

      setVisorMessage("AGUARDANDO CAIXA...", "blue");
      sendValidation({ itemId, quantity, model });
    }
  };

  useEffect(() => {
    socket && loadData();
  }, [socket]);

  useEffect(() => {
    return () => {
      if (pendingValidationTimerRef.current) {
        clearTimeout(pendingValidationTimerRef.current);
      }
    };
  }, []);

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

    const checkQuantity = boxData.OpBoxBlister?.
      filter((bl) => bl.packedAt)
      .reduce((total, blister) => {
        return total + blister.quantity;
      }, 0);

    setBlisterCodes(blisterCodesInUse);
    setBlisters(boxData.OpBoxBlister);
    setQuantityInBox(itemQuantity);
    setCheckedQuantity(checkQuantity);
    setActiveObjectType("box");
    setBox({ ...boxData, status: InspectionStatus.PENDING });
  }

  function handleDetectionUpdate(data: DetectionDto) {
    const receivedCount = data.payload?.count;
    const receivedItemId = data.payload?.item_id;
    const receivedCode = data.payload?.code;

    sendSocketEvent("iaHandler", {
      receivedCount,
      receivedItemId,
    });

    if (receivedItemId) {
      setInspection({
        itemId: receivedItemId,
        count: Number(receivedCount),
        code: receivedCode,
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
        handleOpBoxBreak();
        break;
    }
  }

  function handleOpBoxBreak() {
    const issetPendingBlister = blisters.find((bl) => !bl.packedAt);

    if (step != 2) {
      setVisorMessage("Deve estar na validação de quantidade!", "red");
    } else if (blisters?.length <= 0) {
      setVisorMessage("Não existem blisters disponíveis!", "red");
    } else if (!issetPendingBlister) {
      setVisorMessage("Todos os itens já foram embalados!", "red");
    } else if (data?.finishedAt) {
      setVisorMessage("OP já foi finalizada!", "red");
    } else {
      setOpenForceFinalizationDialog(true);
    }
  }

  useEffect(() => {
    if (!data?.finishedAt && inspection)
      switch (step) {
        case 0:
          boxInspection({ ...inspection, type: activeObjectType });
          break;
        case 1:
          blisterInspection({ ...inspection, type: activeObjectType });
          break;
        case 2:
          quantityInspection({ ...inspection, type: activeObjectType });
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

    let itemId: string | undefined = data?.boxType.name;
    let quantity: number = 1;

    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        setVisorMessage("TIPO DE OBJETO INVÁLIDO. INSIRA UMA CAIXA.", "red");
        sendValidation({ itemId, quantity });
        break;
      case InspectionEnum.TYPE_INVALID:
        setVisorMessage("MODELO DE CAIXA INVÁLIDO. INSIRA UMA CAIXA.", "red");
        sendValidation({ itemId, quantity });
        break;
      case InspectionEnum.QUANTITY_INVALID:
        setVisorMessage("DEVE HAVER UMA CAIXA!", "red");
        sendValidation({ itemId, quantity });
        break;
      case InspectionEnum.VALID:
        setVisorMessage("CAIXA VÁLIDA", "green");
        setTimeout(() => nextObjectValidation(inspection, ObjectTypes.blister), 4000);
        break;
    }
  }

  function blisterInspection(inspection: ObjectValidation) {
    const inspectionData = objectInspection(
      ObjectTypes.blister,
      data!.blisterType.name,
      inspection,
      1
    );

    let itemId: string | undefined = data?.blisterType.name;
    let quantity: number = 1;

    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        setVisorMessage("TIPO DE OBJETO INVÁLIDO. INSIRA UM BLISTER.", "red");
        sendValidation({ itemId, quantity });
        break;
      case InspectionEnum.TYPE_INVALID:
        setVisorMessage("MODELO DE BLISTER INVÁLIDO.", "red");
        sendValidation({ itemId, quantity });
        break;
      case InspectionEnum.QUANTITY_INVALID:
        setVisorMessage("POSICIONE UM BLISTER!", "red");
        sendValidation({ itemId, quantity });
        break;
      case InspectionEnum.VALID:
        if (!inspection.code) {
          setVisorMessage("ENVIE O CÓDIGO DO BLISTER.", "red");
          sendValidation({ itemId, quantity });
        } else if (blisterCodes.includes(inspection.code)) {
          setVisorMessage(
            "ESTE BLISTER JÁ FOI EMBALADO, CODIGO:" + inspection.code,
            "red"
          );
          sendValidation({ itemId, quantity });
        } else {
          setVisorMessage("BLISTER VÁLIDO", "green");
          if (data?.requiresSupervisorConfig && !supervisorConfigured) {
            setPendingInspection(inspection);
            setOpenSupervisorConfigDialog(true);
          } else {
            setTimeout(() => nextObjectValidation(inspection, ObjectTypes.product), 4000);
          }
        }
        break;
    }
  }

  function quantityInspection(inspection: ObjectValidation) {
    const expectedQuantity = blisters[targetBlister!].quantity;
    const inspectionData = objectInspection(
      ObjectTypes.product,
      data!.productType.name,
      inspection,
      expectedQuantity
    );

    let itemId: string | undefined = data?.productType.name;
    let quantity: number = expectedQuantity;
    let fileName: string = `OP_${data?.opId}_BOX_${box?.id}_BL_${
      blisterCodes[targetBlister!]
    }`;

    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        setVisorMessage("TIPO DE OBJETO INVÁLIDO. INSIRA PRODUTOS.", "red");
        sendValidation({ itemId, quantity, fileName });
        break;
      case InspectionEnum.TYPE_INVALID:
        setVisorMessage("MODELO DE PRODUTO INVÁLIDO.", "red");
        sendValidation({ itemId, quantity, fileName });
        break;
      case InspectionEnum.QUANTITY_INVALID:
        setVisorMessage("ALERTA!!! VERIFIQUE PEÇAS!", "yellow");
        sendValidation({ itemId, quantity, fileName });
        break;
      case InspectionEnum.VALID:
        setVisorMessage("BLISTER E QUANTIDADE DE ITENS VÁLIDOS", "green");
        setTimeout(() => verifyNextBlisterOrFinalize(inspection), 4000);
        break;
    }
  }

  function setVisorMessage(message: string, color: DisplayColors) {
    setDisplayColor(color);
    setDisplayMessage(`${message}`.toUpperCase());

    // deviceId garante que a mensagem vai para a fila exclusiva deste óculos
    sendMessageToRabbitMqMobile(
      { mensagem: `${message}`.toUpperCase(), cor: mobileColorKeysMap.get(color) },
      deviceId
    );
  }

  function sendValidation(validation: {
    quantity?: number;
    itemId?: string;
    fileName?: string;
    model?: string;
  }) {
    const validationKey = JSON.stringify(validation);
    const now = Date.now();
    const sameValidation = validationKey === lastValidationKeyRef.current;
    const recentlySent = now - lastValidationSentAtRef.current < 3500;

    // Evita tempestade de comandos idênticos quando a inspeção permanece inválida.
    if (sameValidation && recentlySent) {
      return;
    }
    lastValidationKeyRef.current = validationKey;
    lastValidationSentAtRef.current = now;

    console.log("-------------validation-------------");
    console.log(validation);

    sendSocketEvent("iaHandler", {
      ...validation,
    });

    sendWithDelay(
      {
        ...validation,
      },
      3000
    );
  }

  function nextObjectValidation(
    inspection: ObjectValidation,
    objectType: ObjectTypes
  ) {
    if (!data) throw Error("Falha ao carregar informações da OP");

    switch (objectType) {
      case ObjectTypes.blister:
        setActiveObjectType("blister");
        setTargetBlister(0);
        setStep(1);
        box && setBox({ ...box, status: InspectionStatus.VALID });
        setVisorMessage("POSICIONE UM BLISTER...", "blue");
        sendValidation({ quantity: 1, itemId: data?.blisterType.name });
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

        const newCodes = [...blisterCodes];
        newCodes[targetBlister!] = inspection.code;
        setBlisterCodes([...newCodes]);

        let fileName: string = `OP_${data?.opId}_BOX_${box?.id}_BL_${inspection.code}`;

        setStep(2);
        setVisorMessage("VERIFICANDO QUANTIDADE DE ITENS...", "blue");
        sendValidation({
          quantity: blisters[targetBlister!].quantity,
          itemId: data?.productType.name,
          fileName,
        });
        break;
    }
  }

  function verifyNextBlisterOrFinalize(inspection: ObjectValidation) {
    const index = targetBlister || 0;

    const updatedBlisters = blisters.map((bl, i) =>
      i == index
        ? { ...bl, isValidQuantity: true, status: 1, packedAt: new Date() }
        : bl
    );

    setCheckedQuantity(checkedQuantity + inspection.count);
    setBlisters(updatedBlisters);

    if (blisters[index + 1]) {
      setTargetBlister(index + 1);
      setActiveObjectType("blister");
      setStep(1);
      setVisorMessage("POSICIONE UM NOVO BLISTER", "blue");
      sendValidation({ quantity: 1, itemId: data?.blisterType.name });
    } else {
      setTargetBlister(undefined);
      setActiveObjectType(undefined);
      setStep(3);

      if (opBrakeManagerId) {
        forceOpFinalization(opBrakeManagerId, updatedBlisters);
      } else {
        persistBoxInspection(updatedBlisters);
      }
    }
  }

  async function persistBoxInspection(currentBlisters: OpBoxBlisterInspection[]) {
    if (box) {
      await persistBoxStatusWithBlisters(box.id, currentBlisters)
        .then((result) => {
          setVisorMessage("Inspeção de caixa finalizada com sucesso!", "green");
          setTimeout(async () => {
            printTag(currentBlisters);
          }, 2000);
        })
        .catch((err) => {
          setVisorMessage(err.message, "red");
        });
    }
  }

  const handleCheckOpCompletion = async () => {
    const opCompletion = await opCompletionNowHandler(data!.opId);
    if (opCompletion) {
      setVisorMessage("OP FINALIZADA COM SUCESSO!", "green");
    }
  };

  async function printTag(currentBlisters: OpBoxBlisterInspection[]) {
    const productQuantity = currentBlisters
      .filter((bl) => bl.status == 1)
      .reduce((acc, i) => acc + i.quantity, 0);

    setVisorMessage("IMPRIMINDO ETIQUETA...", "black");

    try {
      const response = await fetch("/api/op-jerp/barcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opId: data!.opId,
          boxId: box!.id,
          quantity: productQuantity,
        }),
      });

      if (!response.ok) {
        const { error, errorData } = await response.json();
        throw new Error(errorData.message || error);
      } else {
        setVisorMessage("ETIQUETA GERADA COM SUCESSO!", "green");

        const tagData = await response.json();
        setQuantityToPrint(tagData!.quantidadeApontada);
        setBarcodeToPrint(tagData!.idBarras);
        setPdfBase64(tagData!.pdfBase64);
        setOpenPrintTagDialog(true);
        handleCheckOpCompletion();
      }
    } catch (error: any) {
      setVisorMessage(error?.message || "FALHA AO GERAR ETIQUETA!", "red");
    }
  }

  async function forceOpFinalization(
    managerId: string,
    currentBlisters: OpBoxBlisterInspection[]
  ) {
    const issetPackedBlister = currentBlisters.find((bl) => bl.packedAt);

    if (box?.status != InspectionStatus.VALID || !issetPackedBlister) {
      setVisorMessage("Não há itens embalados", "red");
    } else {
      await persistWithOpBreak(box, currentBlisters, data!.opId, managerId ?? null)
        .then((_) => {
          setVisorMessage("Caixa finalizada com sucesso!", "green");
          setTimeout(async () => {
            printTag(currentBlisters);
          }, 2000);
        })
        .catch((err) => {
          setVisorMessage(err.message, "red");
        });
    }
  }

  function getStatusVariant(status?: OpStatus) {
    switch (status) {
      case OpStatus.COMPLETED:
        return "success";
      default:
        return "default";
    }
  }

  function getStatusName(status?: OpStatus) {
    switch (status) {
      case OpStatus.COMPLETED:
        return "Concluído";
      case OpStatus.PENDING:
        return "Pendente";
      default:
        return "Indefinidos";
    }
  }

  function redirectAction(uri: string) {
    router.push(`${uri}`);
  }

  function configLastBlisterQuantity(quantity: number, managerId: string) {
    const index = targetBlister || 0;

    if (quantity <= blisters[index].quantity) {
      const itemId = data?.productType.name;
      let fileName: string = `OP_${data?.opId}_BOX_${box?.id}_BL_${
        blisterCodes[targetBlister!]
      }`;

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

      // Apenas guarda o managerId para usar depois
      setOpBrakeManagerId(managerId);

      sendValidation({ itemId, quantity, fileName });
    } else {
      setVisorMessage("QUANTIDADE DEVE SER MENOR OU IGUAL À ATUAL!", "red");
    }
  }

  function handlePrintSuccess(idBarras: string) {
    sendMessageToRabbitMqMobile({
      mensagem: "CAIXA FINALIZADA COM SUCESSO!",
      cor: 3,
    });

    setTimeout(() => {
      redirectAction("/");
    }, 2000);
  }

  return (
    <RequireAuth>
      <div className="h-screen w-full flex flex-col">
        <Header />

        {loading ? (
          <div className="absolute w-full h-full flex justify-center items-center z-10">
            <Loader2 className="h-24 w-24 animate-spin" />
          </div>
        ) : (
          <>
            {data ? (
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
                    statusVariant={getStatusVariant(data?.status) || "default"}
                    startDate={data?.createdAt || new Date()}
                    endDate={data?.finishedAt}
                  />

                  {!data.finishedAt && data.nextBox ? (
                    <>
                      <div>
                        <div className="flex justify-end gap-6 mt-8">
                          <Button
                            className="bg-red-700 hover:bg-red-600"
                            variant={"destructive"}
                            onClick={() => handleOpBoxBreak()}
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
                            status={box?.status}
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
                              <strong>Quantidade verificada:</strong> {checkedQuantity}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto">
                        <BlisterDisplay
                          blisterName={data.blisterType.code}
                          itemName={data.productType.code}
                          blisters={blisters}
                          targetIndex={targetBlister}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-center gap-6 mt-8">
                      <Button size={"lg"} onClick={() => redirectAction(`/op/${data.opId}/detail`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Detalhes da OP
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="container flex flex-col items-center mt-8 gap-6">
                <h2 className="text-xl">Falha ao carregar OP!</h2>
                <Button onClick={() => redirectAction("/")}>Voltar</Button>
              </div>
            )}
          </>
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
          <SupervisorPieceConfigDialog
            isOpen={openSupervisorConfigDialog}
            onOpenChange={setOpenSupervisorConfigDialog}
            pieceName={data.productType.name}
            blisterTypeId={data.blisterType?.id}
            externalOpId={Number(opId)}
            initialSlots={data.blisterType?.slots}
            initialLimitPerBox={data.blisterType?.limitPerBox}
            isNewOp={data.isNewOp}
            availableBlisters={data.availableBlisters}
            preferredBlisterPackagingId={data.preferredBlisterPackagingId}
            onConfirmed={() => {
              setSupervisorConfigured(true);
              setOpenSupervisorConfigDialog(false);
              // Exibe alerta de OP nova criada após configuração do supervisor
              setVisorMessage("OP NOVA CRIADA COM SUCESSO!", "yellow");
              // Aguarda 3 segundos antes de recarregar
              setTimeout(() => {
                // Recarrega os dados para refletir a OP criada (sem isNewOp para evitar loop)
                syncAndGetOpToProduceById(opId)
                  .then((opData) => {
                    // Remove a flag isNewOp para não mostrar o alerta novamente
                    const updatedOpData = { ...opData, isNewOp: false };
                    setData(updatedOpData);
                    continueLoadingFlow(updatedOpData);
                    if (pendingInspection) {
                      nextObjectValidation(pendingInspection, ObjectTypes.product);
                      setPendingInspection(undefined);
                    }
                  })
                  .catch((error) => {
                    setVisorMessage(error?.message || "Falha na sincronização da OP", "red");
                  });
              }, 3000);
            }}
          />
        )}

        {data && (
          <PrintTagDialog
            onPrintSuccess={handlePrintSuccess}
            printConfig={{ pdfBase64: pdfBase64, quantity: quantityToPrint }}
            isOpen={openPrintTagDialog}
            onOpenChange={setOpenPrintTagDialog}
          />
        )}
      </div>
    </RequireAuth>
  );
}