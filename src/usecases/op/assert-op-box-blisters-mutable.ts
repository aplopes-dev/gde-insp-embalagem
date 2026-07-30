import db from "@/providers/database";

/**
 * Impede alterar blisters de uma caixa que já tem etiqueta/apontamento JERP.
 * Evita o cenário OP 80569 / lote 1851454: segundo operador sobrescreve QRs
 * após o primeiro já ter gerado idBarras.
 */
export async function assertOpBoxBlistersMutable(opBoxId: string): Promise<void> {
  const box = await db.opBox.findUnique({
    where: { id: opBoxId },
    select: { barCode: true, code: true },
  });

  if (!box) {
    throw new Error("Caixa não encontrada para persistência.");
  }

  if (box.barCode) {
    throw new Error(
      `Caixa ${box.code} já possui etiqueta (lote ${box.barCode}). ` +
        "Não é permitido alterar blisters após o apontamento. " +
        "Se a embalagem física divergir, acione o supervisor para estorno/correção."
    );
  }
}
