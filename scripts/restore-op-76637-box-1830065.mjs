/**
 * One-off: OP 76637 (id 430213)
 * 1) Reconcile pending to JERP quantidadeAProduzir
 * 2) Restore deleted PACKAGED box etiqueta 1830065 (78 pcs)
 *
 * Run inside frontend container:
 *   node scripts/restore-op-76637-box-1830065.mjs
 */
import { PrismaClient } from "@prisma/client";

const OP_ID = 430213;
const USER_ID = "e0e65e56-a4c0-4c59-8b4f-d0015d7aa44c"; // emerson@gde.com.br
const BARCODE = "1830065";
const RESTORE_BOX_CODE = "21"; // chronological gap before caixa 22
const BLISTER_QRS = [
  "07663700054",
  "07663700053",
  "07663700052",
  "07663700051",
  "07663700050",
  "07663700049",
  "07663700048",
  "07663700047",
  "07663700046",
  "07663700045",
  "07663700044",
  "07663700043",
  "07663700042",
];
const PACKED_AT = new Date("2026-07-09T17:56:08.914Z");
const BARCODE_AT = new Date("2026-07-09T17:56:08.914Z");

const prisma = new PrismaClient();

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

function planBoxes({ quantityToProduce, blisterSlots, blisterPerBox, boxGap }) {
  const blistersToProduce = Math.ceil(quantityToProduce / blisterSlots);
  const boxesToProduce = Math.ceil(blistersToProduce / blisterPerBox);
  const lastBlisterQuantity = quantityToProduce % blisterSlots || blisterSlots;

  return Array.from({ length: boxesToProduce }, (_, boxIndex) => {
    const isLastBox = boxIndex + 1 === boxesToProduce;
    const blisterCount = isLastBox
      ? blistersToProduce % blisterPerBox || blisterPerBox
      : blisterPerBox;
    return {
      code: `${boxIndex + 1 + boxGap}`,
      blisters: Array.from({ length: blisterCount }, (_, i) => ({
        code: `GEN_${i + 1}`,
        quantity:
          isLastBox && i + 1 === blisterCount ? lastBlisterQuantity : blisterSlots,
      })),
    };
  });
}

async function sumPacked(opId) {
  const rows = await prisma.opBoxBlister.findMany({
    where: { opBox: { opId }, packedAt: { not: null } },
    select: { quantity: true },
  });
  return rows.reduce((s, r) => s + r.quantity, 0);
}

async function sumPending(opId) {
  const rows = await prisma.opBoxBlister.findMany({
    where: { opBox: { opId, packedAt: null } },
    select: { quantity: true },
  });
  return rows.reduce((s, r) => s + r.quantity, 0);
}

async function main() {
  const jerpRemaining = await getJerpRemaining(OP_ID);
  console.log("JERP quantidadeAProduzir =", jerpRemaining);

  const op = await prisma.op.findUnique({
    where: { id: OP_ID },
    include: {
      blister: true,
      OpBox: { include: { OpBoxBlister: true } },
    },
  });
  if (!op) throw new Error("OP não encontrada");
  if (!op.blister?.slots || !op.blister?.limitPerBox) {
    throw new Error("OP sem configuração de blister");
  }

  const beforePending = op.OpBox.filter((b) => b.packedAt == null).reduce(
    (t, b) => t + b.OpBoxBlister.reduce((s, bl) => s + bl.quantity, 0),
    0
  );
  console.log("Pendente interno antes =", beforePending);

  const existingBarcode = op.OpBox.find((b) => b.barCode === BARCODE);
  if (existingBarcode) {
    throw new Error(`Etiqueta ${BARCODE} já existe na caixa ${existingBarcode.code}`);
  }
  const codeTaken = op.OpBox.find((b) => b.code === RESTORE_BOX_CODE);
  if (codeTaken) {
    throw new Error(`Código de caixa ${RESTORE_BOX_CODE} já em uso`);
  }
  for (const qr of BLISTER_QRS) {
    const hit = op.OpBox.flatMap((b) => b.OpBoxBlister).find((bl) => bl.code === qr);
    if (hit) throw new Error(`QR ${qr} já existe no banco`);
  }

  // --- 1) Reconcile pending to JERP ---
  await prisma.$transaction([
    prisma.opBoxBlister.deleteMany({
      where: { packedAt: null, opBox: { opId: OP_ID } },
    }),
    prisma.opBox.deleteMany({
      where: { opId: OP_ID, packedAt: null },
    }),
  ]);

  const remainingBoxes = await prisma.opBox.findMany({
    where: { opId: OP_ID },
    select: { code: true },
  });
  const maxCode = remainingBoxes.reduce(
    (max, b) => Math.max(max, Number(b.code) || 0),
    0
  );

  let pendingCreated = [];
  if (jerpRemaining > 0) {
    pendingCreated = planBoxes({
      quantityToProduce: jerpRemaining,
      blisterSlots: op.blister.slots,
      blisterPerBox: op.blister.limitPerBox,
      boxGap: maxCode,
    });

    for (const box of pendingCreated) {
      await prisma.opBox.create({
        data: {
          opId: OP_ID,
          code: box.code,
          status: "PENDING",
          OpBoxBlister: {
            create: box.blisters.map((bl) => ({
              code: bl.code,
              quantity: bl.quantity,
            })),
          },
        },
      });
    }
  }

  await prisma.opActivityLog.create({
    data: {
      opId: OP_ID,
      userId: USER_ID,
      actionType: "STATUS_CHANGED",
      description: `Reconciliação JERP: pendente interno ${beforePending} vs JERP ${jerpRemaining}. Interno ajustado ao JERP.`,
      details: {
        event: "JERP_RECONCILIATION",
        autoCorrect: true,
        jerpRemaining,
        internalPending: beforePending,
        script: "restore-op-76637-box-1830065.mjs",
      },
    },
  });

  console.log(
    "Reconcile OK — caixas pendentes:",
    pendingCreated.map((b) => `${b.code}(${b.blisters.reduce((s, x) => s + x.quantity, 0)})`)
  );

  // --- 2) Restore packaged box 1830065 ---
  const restored = await prisma.opBox.create({
    data: {
      opId: OP_ID,
      code: RESTORE_BOX_CODE,
      status: "PACKAGED",
      packedAt: PACKED_AT,
      barCode: BARCODE,
      barCodeGeneratedAt: BARCODE_AT,
      createdAt: PACKED_AT,
      OpBoxBlister: {
        create: BLISTER_QRS.map((code) => ({
          code,
          quantity: 6,
          packedAt: PACKED_AT,
        })),
      },
    },
    include: { OpBoxBlister: true },
  });

  const packed = await sumPacked(OP_ID);
  const pending = await sumPending(OP_ID);
  await prisma.op.update({
    where: { id: OP_ID },
    data: { quantityToProduce: packed + pending },
  });

  await prisma.opActivityLog.create({
    data: {
      opId: OP_ID,
      userId: USER_ID,
      actionType: "STATUS_CHANGED",
      boxId: restored.id,
      description: `Caixa ${RESTORE_BOX_CODE} reposta (etiqueta ${BARCODE}, 78 peças) após exclusão. Alinhada ao apontamento JERP existente.`,
      details: {
        event: "BOX_RESTORED",
        boxCode: RESTORE_BOX_CODE,
        barCode: BARCODE,
        pieces: 78,
        blisterCodes: BLISTER_QRS,
        script: "restore-op-76637-box-1830065.mjs",
      },
    },
  });

  console.log("Restore OK — box id", restored.id, "code", restored.code);
  console.log("Final: packed=", packed, "pending=", pending, "total=", packed + pending);
  console.log("JERP remaining=", jerpRemaining, "aligned=", pending === jerpRemaining);
}

main()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
