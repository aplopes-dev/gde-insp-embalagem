import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const opBoxes = await db.opBox.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(opBoxes);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao carregar caixas" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const { id, opId, code, status } = await req.json();

    if (!id || !opId || !code) {
      return new Response(
        JSON.stringify({ error: "ID, OP ID e código são obrigatórios" }),
        { status: 400 }
      );
    }

    const opBox = await db.opBox.create({
      data: { id, opId, code, status: status || "PENDING" },
    });

    return Response.json(opBox);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar caixa" }),
      { status: 500 }
    );
  }
}

