import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { nestCreateOp, nestListOps, useGdeApi } from "@/libs/gde-api";

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    if (useGdeApi()) {
      const ops = await nestListOps();
      return Response.json(ops);
    }
    const ops = await db.op.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(ops);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao carregar OPs" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const { id, code, quantityToProduce, status, productTypeId, blisterTypeId, boxTypeId } = await req.json();

    if (!id || !code || !quantityToProduce || !productTypeId || !blisterTypeId || !boxTypeId) {
      return new Response(
        JSON.stringify({ error: "ID, código, quantidade, productTypeId, blisterTypeId e boxTypeId são obrigatórios" }),
        { status: 400 }
      );
    }

    if (useGdeApi()) {
      const op = await nestCreateOp({
        id,
        code,
        quantityToProduce,
        status: status || "PENDING",
        productTypeId,
        blisterTypeId,
        boxTypeId,
      });
      return Response.json(op);
    }

    const op = await db.op.create({
      data: {
        id,
        code,
        quantityToProduce,
        status: status || "PENDING",
        productTypeId,
        blisterTypeId,
        boxTypeId,
      },
    });

    return Response.json(op);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar OP" }),
      { status: 500 }
    );
  }
}

