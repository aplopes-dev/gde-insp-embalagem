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
import { useInspectionSessionLock } from "@/hooks/use-inspection-session-lock";
import { useSocketEmmiter } from "@/hooks/use-socket-emmiter";
import {
  InspectionEnum,
  objectInspection,
} from "@/shared/services/object-inspection";
import { blisterQrMatchesOp } from "@/shared/services/blister-qr-code";
import { sumPlannedBoxQuantity, sortOpBoxBlisters } from "@/usecases/op/find-next-pending-op-box";
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
  fetchAuthoritativePackedBoxSummary,
  syncAndGetOpToProduceById,
  persistInspectionDetectionEvent,
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

import ConfirmationDialog from "@/components/confirmation-dialog";
import RequireAuth from "@/components/require-auth";
import { withDeviceQuery } from "@/shared/utils/with-device-query";

type PendingQuantityValidation = {
  itemId?: string;
  quantity: number;
  fileName?: string;
  model?: string;
};

export default function PackagingInspection({
  params: { opId },
}: {
  params: { opId: string };
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const router       = useRouter();
  const searchParams = useSearchParams();
  // deviceId vem do ?deviceId= (página de seleção) com fallback para env build-time
  const deviceIdFromQuery = searchParams.get("deviceId")?.trim();
  const deviceIdFromEnv = process.env.NEXT_PUBLIC_DEVICE_ID?.trim();
  const deviceId = deviceIdFromQuery || deviceIdFromEnv || undefined;
  const resolvedOpId = String(opId).trim();

  const { isLeader, isChecking: isLockChecking } = useInspectionSessionLock(
    deviceId,
    resolvedOpId
  );
  const isLeaderRef = useRef(isLeader);

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

  const [openPieceCorrectionDialog, setOpenPieceCorrectionDialog] = useState(false);
  const [pieceCorrectionReason, setPieceCorrectionReason] = useState<string | undefined>();
  const [pendingQuantityValidation, setPendingQuantityValidation] =
    useState<PendingQuantityValidation | null>(null);
  const pieceCorrectionDialogOpenRef = useRef(false);

  const [activeObjectType, setActiveObjectType] = useState<ValidableType>();
  /** QR já embalados nesta OP (conjunto cumulativo — nunca sobrescrever por índice). */
  const [usedBlisterCodes, setUsedBlisterCodes] = useState<string[]>([]);
  const pendingValidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommandOpRef = useRef<string | null>(null);
  const lastValidationKeyRef = useRef<string>("");
  const lastValidationSentAtRef = useRef<number>(0);
  const printTagInFlightRef = useRef(false);

  useEffect(() => {
    isLeaderRef.current = isLeader;
  }, [isLeader]);

  const { socket } = useSocketDetection({
    deviceId,
    opId: data?.opId != null ? String(data.opId) : opId,
    onDetectionUpdate: handleDetectionUpdate,
    onActionHandler: handleActionHandler,
  });
  const { sendSocketEvent } = useSocketEmmiter();

  function cancelPendingValidation() {
    if (pendingValidationTimerRef.current) {
      clearTimeout(pendingValidationTimerRef.current);
      pendingValidationTimerRef.current = null;
    }
    pendingCommandOpRef.current = null;
  }

  function sendWithDelay(
    message: {
      op_id?: string | number;
      device_id?: string;
      action?: string;
      step?: string;
      payload?: Record<string, unknown>;
    },
    delay: number = 2000
  ) {
    cancelPendingValidation();
    const messageOpId = String(message.op_id ?? "");
    pendingCommandOpRef.current = messageOpId;
    pendingValidationTimerRef.current = setTimeout(() => {
      pendingValidationTimerRef.current = null;
      if (pendingCommandOpRef.current !== messageOpId) return;
      if (!isLeaderRef.current) return;
      sendMessageToRabbitMq(message);
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
      setVisorMessage(
        opData.pendingBoxes > 0
          ? "TODAS AS CAIXAS PENDENTES ESTÃO EM USO POR OUTRO OPERADOR. AGUARDE OU TROQUE DE POSTO."
          : "NÃO EXISTEM CAIXAS PENDENTES!",
        opData.pendingBoxes > 0 ? "yellow" : "blue"
      );
    } else {
      mountInspecionState(opData.nextBox!, opData.blisterCodes);

      const itemId: string | undefined = opData?.boxType.name;
      const model: string | undefined = opData?.productType.name;
      const quantity: number = 1;
      const boxQty = sumPlannedBoxQuantity(opData.nextBox!.OpBoxBlister ?? []);
      const fullBoxQty =
        opData.blisterType.slots * opData.blisterType.limitPerBox;
      const isPartialBox = boxQty < fullBoxQty;
      const partialNote = isPartialBox ? " — ÚLTIMA CAIXA PARCIAL" : "";

      setVisorMessage(
        `CAIXA ${opData.nextBox!.code} DE ${opData.totalBoxes} — ${boxQty} PEÇAS NA ETIQUETA${partialNote}. AGUARDANDO CAIXA...`,
        "blue"
      );
      sendValidation({ itemId, quantity, model }, { opId: opData.opId });
    }
  };

  useEffect(() => {
    if (!socket || isLockChecking) return;
    if (!isLeader) {
      cancelPendingValidation();
      setLoading(false);
      return;
    }
    loadData();
  }, [socket, isLeader, isLockChecking]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cancelPendingValidation();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelPendingValidation();
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

    setUsedBlisterCodes(blisterCodesInUse);
    setBlisters(sortOpBoxBlisters(boxData.OpBoxBlister));
    setQuantityInBox(itemQuantity);
    setCheckedQuantity(checkQuantity);
    setActiveObjectType("box");
    setBox({ ...boxData, status: InspectionStatus.PENDING });
  }

  /** Código QR do blister atualmente sob inspeção (quantidade / alerta). */
  function currentBlisterCode(): string | undefined {
    if (targetBlister === undefined) return undefined;
    return blisters[targetBlister]?.code || undefined;
  }

  function handleDetectionUpdate(detection: DetectionDto) {
    if (
      detection.op_id &&
      String(detection.op_id) !== resolvedOpId
    ) {
      return;
    }

    const receivedCount = detection.payload?.count;
    const receivedItemId = detection.payload?.item_id;
    const receivedCode = detection.payload?.code;
    const { status, reason } = detection.payload ?? {};

    if (status === "INVALID" || status === "TIMEOUT") {
      void persistDetectionAlert(detection);
    }

    if (status === "INVALID" && reason?.startsWith("QR_") && step === 1) {
      const qrOp = detection.payload?.qr_op as string | undefined;
      if (reason === "QR_OP_MISMATCH" && qrOp) {
        setVisorMessage(
          `BLISTER DE OUTRA OP! QR: ${qrOp} | OP ATUAL: ${data?.opCode}`,
          "red"
        );
      } else {
        setVisorMessage("CÓDIGO QR INVÁLIDO. VERIFIQUE O BLISTER.", "red");
      }
      sendValidation({ itemId: data?.blisterType.name, quantity: 1 });
      return;
    }

    sendSocketEvent("iaHandler", {
      receivedCount,
      receivedItemId,
      status,
    });

    if (!receivedItemId) return;

    if (status === "INVALID") {
      const reason = detection.payload?.reason;
      setPieceCorrectionReason(reason);
      setInspection({
        itemId: receivedItemId,
        count: 0,
        code: receivedCode,
      });
      if (
        step === 2 &&
        targetBlister !== undefined &&
        data &&
        box &&
        currentBlisterCode()
      ) {
        requestPieceCorrection({
          itemId: data.productType.name,
          quantity: blisters[targetBlister].quantity,
          fileName: `OP_${data.opId}_BOX_${box.id}_BL_${currentBlisterCode()}`,
          model: data.productType.name,
        });
      }
      return;
    }

    if (status === "TIMEOUT") {
      setVisorMessage("TEMPO ESGOTADO NA DETECÇÃO!", "yellow");
      setInspection({
        itemId: receivedItemId,
        count: Number(receivedCount) || 0,
        code: receivedCode,
      });
      return;
    }

    setInspection({
      itemId: receivedItemId,
      count: Number(receivedCount),
      code: receivedCode,
    });
  }

  function resolveDetectionImageFilename(detection: DetectionDto): string | undefined {
    const code =
      detection.payload?.code ||
      currentBlisterCode();
    if (!data?.opId || !box?.id || !code) return undefined;
    return `OP_${data.opId}_BOX_${box.id}_BL_${code}`;
  }

  function resolveDetectionStep(detection: DetectionDto): string {
    if (detection.step) return detection.step;
    if (step === 0) return "box";
    if (step === 1) return "blister";
    if (step === 2) return "quantity";
    return "quantity";
  }

  function persistDetectionAlert(detection: DetectionDto) {
    const status = detection.payload?.status;
    if (status !== "INVALID" && status !== "TIMEOUT") return;
    if (!data?.opId) return;

    const capturedAt = detection.timestamp || new Date().toISOString();
    const storagePath = capturedAt.slice(0, 10);

    void persistInspectionDetectionEvent({
      opId: data.opId,
      boxId: box?.id ?? null,
      step: resolveDetectionStep(detection),
      status,
      reason: detection.payload?.reason ?? null,
      confidence: detection.payload?.confidence ?? null,
      defectLabels: detection.payload?.defect_labels ?? [],
      deviceId: detection.device_id || deviceId || null,
      workerId: detection.worker_id || null,
      imageFilename: resolveDetectionImageFilename(detection),
      storagePath,
      capturedAt,
      extraDetails: {
        message_id: detection.message_id,
        item_id: detection.payload?.item_id,
        count: detection.payload?.count,
        wrong_side_labels: detection.payload?.wrong_side_labels,
      },
    }).catch((err) => {
      console.error("[historico] falha ao persistir detecção", err);
    });
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
        } else {
          const qrCheck = blisterQrMatchesOp(inspection.code, data!.opCode);
          if (!qrCheck.valid) {
            if (qrCheck.reason === "OP_MISMATCH") {
              setVisorMessage(
                `BLISTER DE OUTRA OP! QR: ${qrCheck.qrOp} | OP ATUAL: ${data!.opCode}`,
                "red"
              );
            } else {
              setVisorMessage("CÓDIGO QR INVÁLIDO. VERIFIQUE O BLISTER.", "red");
            }
            sendValidation({ itemId, quantity });
          } else if (usedBlisterCodes.includes(inspection.code)) {
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
    let model: string | undefined = data?.productType.name;
    let fileName: string = `OP_${data?.opId}_BOX_${box?.id}_BL_${
      currentBlisterCode() || ""
    }`;

    switch (inspectionData) {
      case InspectionEnum.OBJECT_INVALID:
        setVisorMessage("TIPO DE OBJETO INVÁLIDO. INSIRA PRODUTOS.", "red");
        sendValidation({ itemId, quantity, fileName, model });
        break;
      case InspectionEnum.TYPE_INVALID:
        setVisorMessage("MODELO DE PRODUTO INVÁLIDO.", "red");
        sendValidation({ itemId, quantity, fileName, model });
        break;
      case InspectionEnum.QUANTITY_INVALID:
        requestPieceCorrection({ itemId, quantity, fileName, model });
        break;
      case InspectionEnum.VALID:
        setVisorMessage("BLISTER E QUANTIDADE DE ITENS VÁLIDOS", "green");
        setTimeout(() => verifyNextBlisterOrFinalize(inspection), 4000);
        break;
    }
  }

  function requestPieceCorrection(validation: PendingQuantityValidation) {
    if (pieceCorrectionDialogOpenRef.current) return;

    pieceCorrectionDialogOpenRef.current = true;
    setPendingQuantityValidation(validation);
    setOpenPieceCorrectionDialog(true);
    setVisorMessage("PEÇA INCORRETA. CORRIJA E CONFIRME PARA CONTINUAR.", "yellow");
  }

  function handlePieceCorrectionConfirmed() {
    const validation = pendingQuantityValidation;
    pieceCorrectionDialogOpenRef.current = false;
    setOpenPieceCorrectionDialog(false);
    setPendingQuantityValidation(null);
    setPieceCorrectionReason(undefined);
    lastValidationKeyRef.current = "";

    if (!validation) return;

    setVisorMessage("VERIFICANDO QUANTIDADE DE ITENS...", "blue");
    sendValidation(validation);
  }

  function pieceCorrectionDialogMessage(): string {
    if (pieceCorrectionReason === "WRONG_SIDE") {
      return "Foi detectado o lado errado da peça. Corrija a peça no blister e confirme quando a inspeção estiver correta.";
    }
    if (pieceCorrectionReason === "NON_CONFORMING") {
      return "Foi detectada uma peça não conforme. Corrija a peça no blister e confirme quando a inspeção estiver correta.";
    }
    return "Foi detectada uma peça incorreta na inspeção. Corrija e confirme quando estiver pronto para continuar.";
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

  function sendValidation(
    validation: {
      quantity?: number;
      itemId?: string;
      fileName?: string;
      model?: string;
    },
    opts?: { opId?: number | string }
  ) {
    if (!isLeaderRef.current) return;

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

    const resolvedOpId = String(opts?.opId ?? data?.opId ?? opId).trim();
    const payload: Record<string, unknown> = {};
    if (validation.itemId != null) payload.itemId = validation.itemId;
    if (validation.quantity != null) payload.quantity = validation.quantity;
    if (validation.model != null) payload.model = validation.model;
    if (validation.fileName != null) payload.fileName = validation.fileName;
    if (data?.opCode) payload.opCode = data.opCode;

    if (!deviceId) {
      setVisorMessage(
        "FALTA deviceId NA URL (?deviceId=…). COMANDO NÃO ENVIADO AO WORKER.",
        "red"
      );
      return;
    }
    if (!resolvedOpId) {
      setVisorMessage("OP INVÁLIDA. COMANDO NÃO ENVIADO AO WORKER.", "red");
      return;
    }

    sendWithDelay(
      {
        device_id: deviceId,
        op_id: resolvedOpId,
        action: "START_INSPECTION",
        step: "quantity",
        payload,
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

        let fileName: string = `OP_${data?.opId}_BOX_${box?.id}_BL_${inspection.code}`;

        setStep(2);
        setVisorMessage("VERIFICANDO QUANTIDADE DE ITENS...", "blue");
        sendValidation({
          quantity: blisters[targetBlister!].quantity,
          itemId: data?.productType.name,
          fileName,
          model: data?.productType.name,
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

    // Acumular QR embalados — NUNCA sobrescrever por índice (bug OP 78309 / lote 1850924).
    const packedCode = updatedBlisters[index]?.code || inspection.code;
    if (packedCode) {
      setUsedBlisterCodes((prev) =>
        prev.includes(packedCode) ? prev : [...prev, packedCode]
      );
    }

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
      const boxId = box.id;
      await persistBoxStatusWithBlisters(boxId, currentBlisters)
        .then((result) => {
          setVisorMessage("Inspeção de caixa finalizada com sucesso!", "green");
          setTimeout(async () => {
            printTag(boxId);
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

  async function printTag(boxId: string) {
    if (printTagInFlightRef.current) {
      setVisorMessage("GERAÇÃO DE ETIQUETA JÁ EM ANDAMENTO...", "yellow");
      return;
    }
    printTagInFlightRef.current = true;
    setVisorMessage("CONFERINDO QUANTIDADE INSPECIONADA...", "black");

    try {
      const packedSummary = await fetchAuthoritativePackedBoxSummary(boxId);

      if (!packedSummary || packedSummary.quantity <= 0) {
        throw new Error(
          "Nenhum blister embalado encontrado no banco. A etiqueta não pode ser gerada."
        );
      }

      setVisorMessage(
        `IMPRIMINDO ETIQUETA — ${packedSummary.quantity} PEÇAS (${packedSummary.blisterCount} BLISTERS)...`,
        "black"
      );

      const response = await fetch("/api/op-jerp/barcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opId: data!.opId,
          boxId,
          clientQuantity: packedSummary.quantity,
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
    } finally {
      printTagInFlightRef.current = false;
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
            printTag(box!.id);
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
    router.push(withDeviceQuery(uri, deviceId));
  }

  function configLastBlisterQuantity(quantity: number, managerId: string) {
    const index = targetBlister || 0;

    if (quantity <= blisters[index].quantity) {
      const itemId = data?.productType.name;
      let fileName: string = `OP_${data?.opId}_BOX_${box?.id}_BL_${
        currentBlisterCode() || ""
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
    sendMessageToRabbitMqMobile(
      {
        mensagem: "CAIXA FINALIZADA COM SUCESSO!",
        cor: 3,
      },
      deviceId
    );

    setTimeout(() => {
      redirectAction("/");
    }, 2000);
  }

  return (
    <RequireAuth>
      <div className="h-screen w-full flex flex-col">
        <Header />

        {isLockChecking || loading ? (
          <div className="absolute w-full h-full flex justify-center items-center z-10">
            <Loader2 className="h-24 w-24 animate-spin" />
          </div>
        ) : !isLeader ? (
          <div className="container flex flex-col items-center mt-16 gap-6 px-4">
            <h2 className="text-xl text-center font-semibold">
              Outra aba já está usando este óculos para inspeção
            </h2>
            <p className="text-muted-foreground text-center max-w-lg">
              Mantenha apenas uma janela aberta por óculos. Várias abas (mesmo OP
              ou OPs diferentes) enviam comandos conflitantes ao worker.
            </p>
            <Button onClick={() => redirectAction("/")}>Voltar ao início</Button>
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
                          {pendingQuantityValidation && !openPieceCorrectionDialog ? (
                            <Button
                              className="bg-yellow-600 hover:bg-yellow-500"
                              onClick={() => {
                                pieceCorrectionDialogOpenRef.current = true;
                                setOpenPieceCorrectionDialog(true);
                              }}
                            >
                              Confirmar correção da peça
                            </Button>
                          ) : null}
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
                          <div className="mb-2 text-sm xl:text-base">
                            <strong>Sequência:</strong> Caixa{" "}
                            {data.totalBoxes - data.pendingBoxes + 1} de{" "}
                            {data.totalBoxes}
                            {box?.code &&
                            String(data.totalBoxes - data.pendingBoxes + 1) !==
                              box.code ? (
                              <span className="ml-1 text-muted-foreground">
                                (código {box.code})
                              </span>
                            ) : null}
                            {quantityInBox <
                            data.blisterType.slots *
                              data.blisterType.limitPerBox ? (
                              <span className="ml-2 font-semibold text-amber-700">
                                (última caixa parcial — {quantityInBox} peças na
                                etiqueta)
                              </span>
                            ) : (
                              <span className="ml-2 text-muted-foreground">
                                ({quantityInBox} peças na etiqueta)
                              </span>
                            )}
                          </div>
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

        <ConfirmationDialog
          title="Peça incorreta na inspeção"
          message={pieceCorrectionDialogMessage()}
          cancelLabel="Ainda não"
          confirmLabel="Já corrigi, continuar"
          open={openPieceCorrectionDialog}
          onOpenChange={(open) => {
            if (!open && pieceCorrectionDialogOpenRef.current) {
              pieceCorrectionDialogOpenRef.current = false;
              setOpenPieceCorrectionDialog(false);
            }
          }}
          confirmationAction={handlePieceCorrectionConfirmed}
        />

        <ManagerAuthFormDialog
          title={"Autorizar quebra de Caixa"}
          message={
            "A caixa será finalizada com os itens embalados até o momento. **ATENÇÃO** Essa ação não poderá ser desfeita."
          }
          isOpen={openForceFinalizationDialog}
          initialQuantity={inspection?.count}
          packedQuantity={blisters
            .filter((bl) => bl.packedAt)
            .reduce((total, bl) => total + bl.quantity, 0)}
          expectedQuantity={quantityInBox}
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
            initialSlots={data.blisterType?.slots || undefined}
            initialLimitPerBox={data.blisterType?.limitPerBox || undefined}
            isNewOp={data.isNewOp}
            availableBlisters={data.availableBlisters}
            preferredBlisterPackagingId={data.preferredBlisterPackagingId}
            supervisorConfigReason={data.supervisorConfigReason}
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
            printConfig={{
              pdfBase64: pdfBase64,
              quantity: quantityToPrint,
              barcode: barcodeToPrint,
            }}
            isOpen={openPrintTagDialog}
            onOpenChange={setOpenPrintTagDialog}
          />
        )}
      </div>
    </RequireAuth>
  );
}