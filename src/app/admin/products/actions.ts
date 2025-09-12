"use server";

import db from "@/providers/database";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermissionDb } from "@/shared/auth/permissions-db";
import { logAction } from "@/shared/services/audit";
import { z } from "zod";

export async function updateProductPackaging(formData: FormData) {
  // Permissão: somente quem pode editar catálogo
  await requirePermissionDb("CAN_EDIT_CATALOG");

  const session = await getServerSession(authOptions);
  const actorUserId = session?.user ? Number((session.user as any).id) : undefined;

  const productTypeId = Number(formData.get("productTypeId"));
  const boxTypeId = Number(formData.get("boxTypeId"));
  const blisterTypeId = Number(formData.get("blisterTypeId"));

  const newProductName = (formData.get("productName") as string | null)?.trim();
  const newBoxName = (formData.get("boxName") as string | null)?.trim();
  const newBlisterName = (formData.get("blisterName") as string | null)?.trim();
  const newSlots = Number(formData.get("slots"));
  const newLimitPerBox = Number(formData.get("limitPerBox"));

  // Validações com Zod (números > 0)
  const NumericSchema = z.object({
    slots: z.number().int().positive("Slots deve ser maior que zero."),
    limitPerBox: z.number().int().positive("Limite por caixa deve ser maior que zero."),
  });
  const parsed = NumericSchema.safeParse({ slots: newSlots, limitPerBox: newLimitPerBox });
  if (!parsed.success) {
    const msg = parsed.error.issues?.[0]?.message || "Dados inválidos.";
    return { status: "error" as const, message: msg };
  }


  // Coletar "before" para auditoria
  const [beforeProduct, beforeBox, beforeBlister] = await Promise.all([
    Number.isFinite(productTypeId)
      ? db.productType.findUnique({ where: { id: productTypeId }, select: { id: true, name: true } })
      : null,
    Number.isFinite(boxTypeId)
      ? db.boxType.findUnique({ where: { id: boxTypeId }, select: { id: true, name: true } })
      : null,
    Number.isFinite(blisterTypeId)
      ? db.blisterType.findUnique({ where: { id: blisterTypeId }, select: { id: true, name: true, slots: true, limitPerBox: true } })
      : null,
  ]);

  let changed = false;


  // Atualizações e auditoria
  if (beforeProduct && newProductName && newProductName.length && newProductName !== beforeProduct.name) {
    changed = true;
    const updated = await db.productType.update({ where: { id: beforeProduct.id }, data: { name: newProductName } });
    await logAction({
      userId: actorUserId,
      action: "UPDATE_PRODUCT_TYPE",
      entity: "ProductType",
      entityId: String(updated.id),
      before: { name: beforeProduct.name },
      after: { name: updated.name },
    });
  }

  if (beforeBox && newBoxName && newBoxName.length && newBoxName !== beforeBox.name) {
    changed = true;
    const updated = await db.boxType.update({ where: { id: beforeBox.id }, data: { name: newBoxName } });
    await logAction({
      userId: actorUserId,
      action: "UPDATE_BOX_TYPE",
      entity: "BoxType",
      entityId: String(updated.id),
      before: { name: beforeBox.name },
      after: { name: updated.name },
    });
  }

  if (beforeBlister) {
    const data: any = {};
    if (newBlisterName && newBlisterName.length && newBlisterName !== beforeBlister.name) data.name = newBlisterName;
    if (typeof newSlots === "number" && Number.isFinite(newSlots) && newSlots !== beforeBlister.slots) data.slots = newSlots;
    if (
      typeof newLimitPerBox === "number" &&
      Number.isFinite(newLimitPerBox) &&
      newLimitPerBox !== beforeBlister.limitPerBox
    )
      data.limitPerBox = newLimitPerBox;

    if (Object.keys(data).length) {
      changed = true;
      const updated = await db.blisterType.update({ where: { id: beforeBlister.id }, data });
      await logAction({
        userId: actorUserId,
        action: "UPDATE_BLISTER_TYPE",
        entity: "BlisterType",
        entityId: String(updated.id),
        before: beforeBlister,
        after: { name: updated.name, slots: updated.slots, limitPerBox: updated.limitPerBox },
      });
    }
  }

  if (!changed) {
    return { status: "noop" as const, message: "Nenhuma alteração detectada." };
  }
  revalidatePath("/admin/products");
  return { status: "ok" as const };
}

