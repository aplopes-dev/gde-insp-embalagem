// Serviço de Auditoria centralizado
// Use logAction em Server Actions/APIs para registrar as operações do usuário.
// Tudo em PT-BR e simples.

import db from "@/providers/database";

export type AuditParams = {
  userId: number | null | undefined; // Permite null quando a ação não identificar usuário
  action: string; // Ex.: CREATE_OP, UPDATE_BLISTER_TYPE, FINALIZE_WITH_BREAK
  entity: string; // Ex.: Op, OpBox, ProductType, BoxType, BlisterType
  entityId: string; // ID em string para facilitar
  before?: any;
  after?: any;
};

export async function logAction(params: AuditParams) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? 0, // Opcionalmente poderíamos ter um usuário "sistema" id=0
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before ?? {},
        after: params.after ?? {},
      },
    });
  } catch (e) {
    console.error("[AUDIT] Falha ao registrar auditoria", e);
  }
}

