/**
 * Correção OP 80569 / caixa 7:
 * - JERP já tem apontamento correto (QRs do sistema) em idBarras 1852404
 * - Local ainda aponta para 1851454 (apontamento original com QRs errados)
 *
 * Este script:
 * 1) Atualiza OpBox.barCode 1851454 → 1852404
 * 2) Regista auditoria BARCODE_GENERATED / BARCODE_CORRECTED com QRs do sistema
 *
 * IMPORTANTE (manual no JERP): estornar o lote 1851454 para a quantidade
 * restante voltar a 111 (hoje está 75 por causa do apontamento correto extra).
 *
 *   set -a && source .env && set +a
 *   node scripts/fix-op-80569-lote-1851454.mjs
 */
import { PrismaClient } from "@prisma/client";

const BOX_ID = "cms5wpzsf05pbex9810yc83ou";
const OP_ID = 452360;
const OLD_BARCODE = "1851454";
const NEW_BARCODE = "1852404";
const USER_ID = "e0e65e56-a4c0-4c59-8b4f-d0015d7aa44c"; // emerson@gde.com.br
const SYSTEM_QRS = [
  "08056900136",
  "08056900137",
  "08056900138",
  "08056900139",
  "08056900140",
  "08056900141",
  "08056900142",
  "08056900143",
  "08056900144",
];

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

async function main() {
  const box = await prisma.opBox.findUnique({
    where: { id: BOX_ID },
    include: {
      OpBoxBlister: { orderBy: { packedAt: "asc" } },
      op: { select: { code: true } },
    },
  });
  if (!box) throw new Error(`Caixa ${BOX_ID} não encontrada`);

  const localQrs = box.OpBoxBlister.map((b) => b.code);
  const qty = box.OpBoxBlister.reduce((s, b) => s + b.quantity, 0);
  const jerpRemaining = await getJerpRemaining(OP_ID);

  console.log("Antes:", {
    op: box.op.code,
    boxCode: box.code,
    barCode: box.barCode,
    qty,
    localQrs,
    jerpRemaining,
    esperadoAposEstorno1851454: 111,
  });

  if (box.barCode !== OLD_BARCODE && box.barCode !== NEW_BARCODE) {
    throw new Error(
      `barCode inesperado: ${box.barCode} (esperado ${OLD_BARCODE} ou ${NEW_BARCODE})`
    );
  }

  for (const qr of SYSTEM_QRS) {
    if (!localQrs.includes(qr)) {
      throw new Error(`QR do sistema ausente na caixa: ${qr}`);
    }
  }

  if (box.barCode === NEW_BARCODE) {
    console.log("Local já está com o lote corrigido", NEW_BARCODE);
  } else {
    await prisma.opBox.update({
      where: { id: BOX_ID },
      data: {
        barCode: NEW_BARCODE,
        barCodeGeneratedAt: new Date(),
      },
    });
    console.log(`barCode atualizado: ${OLD_BARCODE} → ${NEW_BARCODE}`);
  }

  await prisma.opActivityLog.create({
    data: {
      opId: OP_ID,
      userId: USER_ID,
      actionType: "STATUS_CHANGED",
      description:
        `Correção divergência lote: etiqueta local ${OLD_BARCODE} → ${NEW_BARCODE}. ` +
        `QRs alinhados ao sistema (${SYSTEM_QRS.length} blisters, ${qty} peças). ` +
        `Estornar manualmente no JERP o lote ${OLD_BARCODE} (QRs incorretos).`,
      boxId: BOX_ID,
      details: {
        event: "BARCODE_GENERATED",
        correction: true,
        previousIdBarras: Number(OLD_BARCODE),
        idBarras: Number(NEW_BARCODE),
        authoritativeQuantity: qty,
        quantidadeApontada: qty,
        embalagens: SYSTEM_QRS.map((barcode) => ({ barcode })),
        jerpRemainingBefore: jerpRemaining,
        note:
          "Apontamento JERP com QRs corretos já existia em 1852404. " +
          "Estornar 1851454 no JERP para quantidadeAProduzir voltar a 111.",
        via: "scripts/fix-op-80569-lote-1851454.mjs",
      },
    },
  });

  const after = await prisma.opBox.findUnique({
    where: { id: BOX_ID },
    select: { barCode: true, barCodeGeneratedAt: true },
  });
  const jerpAfter = await getJerpRemaining(OP_ID);

  console.log("Depois:", {
    barCode: after?.barCode,
    barCodeGeneratedAt: after?.barCodeGeneratedAt,
    jerpRemaining: jerpAfter,
  });
  console.log(`
PRÓXIMO PASSO OBRIGATÓRIO (manual no JERP):
  1. Estornar o lote/etiqueta ${OLD_BARCODE} da OP 80569
  2. Confirmar que quantidadeAProduzir volta para 111
  3. Reimprimir a etiqueta física da caixa 7 com o lote ${NEW_BARCODE}
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
