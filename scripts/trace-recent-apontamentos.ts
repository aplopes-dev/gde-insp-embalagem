import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Caixas etiquetadas recentemente (barCodeGeneratedAt preenchido).
  const recentTagged = await db.opBox.findMany({
    where: { barCodeGeneratedAt: { not: null } },
    orderBy: { barCodeGeneratedAt: "desc" },
    take: 8,
    include: {
      op: { select: { id: true, code: true } },
      OpBoxBlister: {
        select: { code: true, quantity: true, packedAt: true },
        orderBy: { packedAt: "asc" },
      },
    },
  });

  console.log("╔═══ CAIXAS ETIQUETADAS RECENTEMENTE ═══╗");
  if (recentTagged.length === 0) {
    console.log("Nenhuma caixa com barCodeGeneratedAt encontrada.");
  }
  for (const box of recentTagged) {
    const packed = box.OpBoxBlister.filter((b) => b.packedAt != null);
    const semCode = packed.filter((b) => !b.code || b.code.trim() === "");
    console.log("─".repeat(60));
    console.log(`OP ${box.op.code} | caixa ${box.code} | etiqueta=${box.barCode}`);
    console.log(`  gerada em: ${box.barCodeGeneratedAt?.toISOString()}`);
    console.log(`  blisters embalados: ${packed.length} | sem code: ${semCode.length}`);
    console.log(
      `  codes: ${packed.map((b) => b.code || "(vazio)").join(", ") || "(nenhum)"}`
    );
  }

  // Auditoria de geração de etiqueta (só a rota /api/op-jerp/barcode grava isto).
  const logs = await db.opActivityLog.findMany({
    where: { details: { path: ["event"], equals: "BARCODE_GENERATED" } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("\n╔═══ AUDITORIA BARCODE_GENERATED (rota /api/op-jerp/barcode) ═══╗");
  if (logs.length === 0) {
    console.log(
      "Nenhum log BARCODE_GENERATED. (Se as etiquetas são geradas pela tabela diária,"
    );
    console.log(" via generateBarcodeByBoxId, esse caminho NÃO grava auditoria.)");
  }
  for (const log of logs) {
    console.log("─".repeat(60));
    console.log(`${log.createdAt.toISOString()} | opId=${log.opId}`);
    console.log(`  ${log.description}`);
    console.log(`  details: ${JSON.stringify((log as any).details)}`);
  }
}

main()
  .catch((e) => console.error("Erro:", e))
  .finally(() => db.$disconnect());
