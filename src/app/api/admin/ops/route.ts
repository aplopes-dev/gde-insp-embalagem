import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "ADMINISTRADOR") return forbidden();

  try {
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

  if (role !== "ADMINISTRADOR") return forbidden();

  try {
    const { id, code, quantityToProduce, status } = await req.json();

    if (!id || !code || !quantityToProduce) {
      return new Response(
        JSON.stringify({ error: "ID, código e quantidade são obrigatórios" }),
        { status: 400 }
      );
    }

    const op = await db.op.create({
      data: { id, code, quantityToProduce, status: status || "PENDING" },
    });

    return Response.json(op);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar OP" }),
      { status: 500 }
    );
  }
}

