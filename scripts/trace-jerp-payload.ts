import { PrismaClient } from "@prisma/client";
import { buildJerpEmbalagemApontamento } from "../src/usecases/op-jerp/build-jerp-embalagem-apontamento";

const db = new PrismaClient();

async function main() {
  const boxes = await db.opBox.findMany({
    where: {
      OpBoxBlister: { some: { packedAt: { not: null } } },
    },
    orderBy: { barCodeGeneratedAt: "desc" },
    take: 5,
    include: {
      op: { select: { id: true, code: true } },
      OpBoxBlister: {
        where: { packedAt: { not: null } },
        select: { code: true, quantity: true, packedAt: true },
        orderBy: { packedAt: "asc" },
      },
    },
  });

  if (boxes.length === 0) {
    console.log("Nenhuma caixa com blisters embalados encontrada no banco.");
    return;
  }

  for (const box of boxes) {
    const packed = box.OpBoxBlister.map((b) => ({
      code: b.code,
      quantity: b.quantity,
    }));
    const embalagens = buildJerpEmbalagemApontamento(packed);
    const quantidadeApontada = packed.reduce((acc, b) => acc + b.quantity, 0);

    const payload = {
      id: box.op.id,
      quantidadeApontada,
      userName: "<email-da-sessao>",
      embalagens,
    };

    console.log("═".repeat(70));
    console.log(`OP code ${box.op.code} (id interno ${box.op.id})`);
    console.log(`Caixa ${box.code} (id ${box.id})`);
    console.log(`barCode etiqueta (idBarras salvo): ${box.barCode ?? "—"}`);
    console.log(`Blisters embalados: ${packed.length}`);
    console.log("Payload que seria enviado ao JERP (POST /ordemproducao) — embalagens: [{ barcode }]:");
    console.log(JSON.stringify(payload, null, 2));
  }
}

main()
  .catch((e) => {
    console.error("Erro no rastreio:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
