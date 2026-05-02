/**
 * Utilitário para registrar ações no OpActivityLog (chamadas client-side via fetch).
 * Para server actions use db.opActivityLog.create diretamente.
 */

export type ActivityActionType =
  | "BOX_PACKED"
  | "BOX_BREAK_AUTHORIZED"
  | "PRODUCT_CREATED"
  | "PRODUCT_AUTHORIZED"
  | "OP_STARTED"
  | "OP_COMPLETED";

interface LogActivityParams {
  opId: number;
  userId: string;
  actionType: ActivityActionType;
  description: string;
  details?: Record<string, any>;
  boxId?: string;
  productId?: number;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const response = await fetch(`/api/admin/ops/${params.opId}/log-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actionType: params.actionType,
        description: params.description,
        details: params.details ?? null,
        boxId: params.boxId ?? null,
        productId: params.productId ?? null,
      }),
    });

    if (!response.ok) {
      console.error("[logActivity] Erro ao registrar atividade:", response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[logActivity] Erro ao registrar atividade:", error);
    return null;
  }
}

export async function logBoxPacked(
  opId: number,
  userId: string,
  boxId: string,
  deviceId?: string
) {
  return logActivity({
    opId,
    userId,
    actionType: "BOX_PACKED",
    description: `Caixa ${boxId} embalada`,
    details: deviceId ? { deviceId } : undefined,
    boxId,
  });
}

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
    details: { productName, productCode },
    productId,
  });
}

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

export async function logOpStarted(opId: number, userId: string) {
  return logActivity({
    opId,
    userId,
    actionType: "OP_STARTED",
    description: "OP iniciada",
  });
}

export async function logOpCompleted(opId: number, userId: string) {
  return logActivity({
    opId,
    userId,
    actionType: "OP_COMPLETED",
    description: "OP concluída",
  });
}
