/**
 * Utilitário para registrar ações no OpActivityLog
 * Usado para rastrear inspeções, criações de peças, etc.
 */

export type ActivityActionType =
  | "BOX_INSPECTION_APPROVED"
  | "BOX_INSPECTION_REJECTED"
  | "PRODUCT_CREATED"
  | "PRODUCT_AUTHORIZED"
  | "STATUS_CHANGED"
  | "OP_STARTED"
  | "OP_COMPLETED"
  | "DETECTION_INVALID"
  | "DETECTION_TIMEOUT"
  | "OCCURRENCE_OPENED"
  | "OCCURRENCE_CLOSED";

interface LogActivityParams {
  opId: number;
  userId: string;
  actionType: ActivityActionType;
  description: string;
  details?: Record<string, unknown>;
  boxId?: string;
  productId?: number;
  occurrenceId?: string;
  detectionStatus?: "VALID" | "INVALID" | "TIMEOUT" | "ERROR";
  imageFilename?: string;
  storagePath?: string;
  confidence?: number;
  deviceId?: string;
}

/**
 * Registra uma ação no activity log (via API admin).
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const response = await fetch(`/api/admin/ops/${params.opId}/log-action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionType: params.actionType,
        description: params.description,
        details: params.details || null,
        boxId: params.boxId || null,
        productId: params.productId || null,
        occurrenceId: params.occurrenceId || null,
        detectionStatus: params.detectionStatus || null,
        imageFilename: params.imageFilename || null,
        storagePath: params.storagePath || null,
        confidence: params.confidence ?? null,
        deviceId: params.deviceId || null,
      }),
    });

    if (!response.ok) {
      console.error("Erro ao registrar atividade:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao registrar atividade:", error);
    return null;
  }
}

/**
 * Registra uma inspeção de caixa aprovada
 */
export async function logBoxInspectionApproved(
  opId: number,
  userId: string,
  boxId: string,
  defectCount: number = 0,
  observations?: string
) {
  return logActivity({
    opId,
    userId,
    actionType: "BOX_INSPECTION_APPROVED",
    description: `Caixa ${boxId} inspecionada e aprovada`,
    details: {
      defectCount,
      observations,
    },
    boxId,
  });
}

/**
 * Registra uma inspeção de caixa rejeitada
 */
export async function logBoxInspectionRejected(
  opId: number,
  userId: string,
  boxId: string,
  defectCount: number,
  observations?: string
) {
  return logActivity({
    opId,
    userId,
    actionType: "BOX_INSPECTION_REJECTED",
    description: `Caixa ${boxId} inspecionada e rejeitada (${defectCount} defeitos)`,
    details: {
      defectCount,
      observations,
    },
    boxId,
  });
}

/**
 * Registra a criação de uma peça
 */
export async function logProductCreated(
  opId: number,
  userId: string,
  productId: number,
  productName: string,
  productCode: string
) {
  return logActivity({
    opId,
    userId,
    actionType: "PRODUCT_CREATED",
    description: `Peça "${productName}" (${productCode}) criada`,
    details: {
      productName,
      productCode,
    },
    productId,
  });
}

/**
 * Registra a autorização de uma peça por supervisor
 */
export async function logProductAuthorized(
  opId: number,
  supervisorId: string,
  productId: number,
  productName: string
) {
  return logActivity({
    opId,
    userId: supervisorId,
    actionType: "PRODUCT_AUTHORIZED",
    description: `Peça "${productName}" autorizada por supervisor`,
    productId,
  });
}

/**
 * Registra uma mudança de status da OP
 */
export async function logStatusChanged(
  opId: number,
  userId: string,
  oldStatus: string,
  newStatus: string
) {
  return logActivity({
    opId,
    userId,
    actionType: "STATUS_CHANGED",
    description: `Status da OP alterado de ${oldStatus} para ${newStatus}`,
    details: {
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Registra o início de uma OP
 */
export async function logOpStarted(opId: number, userId: string) {
  return logActivity({
    opId,
    userId,
    actionType: "OP_STARTED",
    description: "OP iniciada",
  });
}

/**
 * Registra a conclusão de uma OP
 */
export async function logOpCompleted(opId: number, userId: string) {
  return logActivity({
    opId,
    userId,
    actionType: "OP_COMPLETED",
    description: "OP concluída",
  });
}
