/**
 * One-off: OP 72858 (id 416441) — excluir caixa etiqueta 1851668 (código 104).
 *
 *   set -a && source .env && set +a
 *   node scripts/delete-op-72858-box-1851668.mjs
 */
import { PrismaClient } from "@prisma/client";

const BOX_ID = "cms4wtezy0470ex9870rdp4ng";
const USER_ID = "e0e65e56-a4c0-4c59-8b4f-d0015d7aa44c"; // emerson@gde.com.br
const CONFIRM_ESTORNO = true;

const prisma = new PrismaClient();

function sumPieces(box) {
  return (box.OpBoxBlister || []).reduce((s, b) => s + b.quantity, 0);
}

function computeInternalPending(boxes, excludeBoxId) {
  return boxes
    .filter((box) => box.packedAt == null && box.id !== excludeBoxId)
    .reduce((total, box) => total + sumPieces(box), 0);
}

async function getJerpRemaining(opId) {
  const api = process.env.JERP_API?.replace(/\/$/, "");
  const token = process.env.JERP_TOKEN;
  if (!api || !token) throw new Error("JERP_API / JERP_TOKEN ausentes");

  const res = await fetch(`${api}/ordemproducaoid/${opId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`JERP HTTP ${res.status}`);
  let data = await res.json();
  if (typeof data === "string") data = JSON.parse(data);
  return data.quantidadeAProduzir ?? 0;
}

function maxPackedOpBoxCode(boxes) {
  return boxes
    .filter((b) => b.packedAt != null)
    .reduce((max, b) => Math.max(max, Number(b.code) || 0), 0);
}

function createOpBoxesData({
  quantityToProduce,
  blisterSlots,
  blisterPerBox,
  boxGap,
}) {
  const slots = blisterSlots || 1;
  const perBox = blisterPerBox || 1;
  const blistersToProduce = Math.ceil(quantityToProduce / slots);
  const boxesToProduce = Math.ceil(blistersToProduce / perBox);
  const lastBlisterQuantity = quantityToProduce % slots || slots;

  return Array.from({ length: boxesToProduce }, (_, boxIndex) => {
    const isLastBox = boxIndex + 1 === boxesToProduce;
    const blisterCount = isLastBox
      ? blistersToProduce % perBox || perBox
      : perBox;
    return {
      code: `${boxIndex + 1 + boxGap}`,
      status: "PENDING",
      OpBoxBlister: {
        create: Array.from({ length: blisterCount }, (_, i) => ({
          code: `GEN_${i + 1}`,
          quantity:
            isLastBox && i + 1 === blisterCount ? lastBlisterQuantity : slots,
        })),
      },
    };
  });
}

async function recalculateBoxesFromOpAndItemQuantity(opId, quantityToProduce) {
  const op = await prisma.op.findUnique({
    where: { id: opId },
    include: { blister: true, OpBox: true },
  });
  if (!op) throw new Error(`Not found OP with ID: ${opId}`);

  await prisma.$transaction([
    prisma.opBoxBlister.deleteMany({
      where: { packedAt: null, opBox: { opId } },
    }),
    prisma.opBox.deleteMany({
      where: { opId, packedAt: null },
    }),
  ]);

  if (quantityToProduce <= 0) {
    return prisma.op.findUnique({ where: { id: opId } });
  }

  const maxCode = maxPackedOpBoxCode(op.OpBox);
  const boxes = createOpBoxesData({
    quantityToProduce,
    blisterSlots: op.blister?.slots,
    blisterPerBox: op.blister?.limitPerBox,
    boxGap: maxCode,
  });

  const packedRows = await prisma.opBoxBlister.findMany({
    where: { opBox: { opId }, packedAt: { not: null } },
    select: { quantity: true },
  });
  const itemsPacked = packedRows.reduce((s, r) => s + r.quantity, 0);

  return prisma.op.update({
    where: { id: opId },
    data: {
      quantityToProduce: itemsPacked + quantityToProduce,
      OpBox: { create: boxes },
    },
  });
}

async function main() {
  const box = await prisma.opBox.findUnique({
    where: { id: BOX_ID },
    include: {
      OpBoxBlister: true,
      op: { include: { OpBox: { include: { OpBoxBlister: true } } } },
    },
  });

  if (!box) {
    console.log("Caixa já não existe:", BOX_ID);
    return;
  }

  const pieces = sumPieces(box);
  console.log("Antes:", {
    id: box.id,
    opId: box.opId,
    opCode: box.op.code,
    code: box.code,
    barCode: box.barCode,
    status: box.status,
    pieces,
    blisters: box.OpBoxBlister.map((b) => b.code),
  });

  if (box.barCode && !CONFIRM_ESTORNO) {
    throw new Error("confirmJerpReversal necessário");
  }

  const jerpRemaining = await getJerpRemaining(box.opId);
  const pendingOther = computeInternalPending(box.op.OpBox, box.id);
  const requiredRemaining = pendingOther + pieces;
  console.log("JERP gate:", {
    jerpRemaining,
    pendingOther,
    pieces,
    requiredRemaining,
  });

  if (jerpRemaining < requiredRemaining) {
    throw new Error(
      `Estorno ainda não refletido. Restante ${jerpRemaining}; necessário ${requiredRemaining}.`
    );
  }

  await prisma.opBox.delete({ where: { id: box.id } });
  console.log("Caixa excluída.");

  await recalculateBoxesFromOpAndItemQuantity(
    box.opId,
    Math.max(0, jerpRemaining)
  );
  console.log("Pendentes recriadas a partir do JERP.");

  try {
    await prisma.opActivityLog.create({
      data: {
        opId: box.opId,
        userId: USER_ID,
        actionType: "STATUS_CHANGED",
        description: `Caixa ${box.code} excluída (após estorno JERP). Pendentes recriadas a partir do JERP (${jerpRemaining} peças).`,
        details: {
          event: "BOX_DELETED",
          boxId: box.id,
          code: box.code,
          barCode: box.barCode,
          pieces,
          status: box.status,
          packedAt: box.packedAt,
          jerpRemaining,
          estornoConfirmado: true,
          via: "scripts/delete-op-72858-box-1851668.mjs",
        },
        boxId: box.id,
      },
    });
  } catch (e) {
    console.warn("Falha ao registrar activity log:", e.message);
  }

  const after = await prisma.opBox.findUnique({ where: { id: BOX_ID } });
  const totals = await prisma.opBox.groupBy({
    by: ["status"],
    where: { opId: box.opId },
    _count: true,
  });
  console.log("Depois: boxExists=", Boolean(after), "totais=", totals);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
