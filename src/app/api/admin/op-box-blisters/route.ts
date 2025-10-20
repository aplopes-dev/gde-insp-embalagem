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
    const opBoxBlisters = await db.opBoxBlister.findMany({
      orderBy: { packedAt: "desc" },
    });
    return Response.json(opBoxBlisters);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao carregar blisters" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "ADMINISTRADOR") return forbidden();

  try {
    const { id, opBoxId, code, quantity } = await req.json();

    if (!id || !opBoxId || !code || !quantity) {
      return new Response(
        JSON.stringify({ error: "ID, OpBox ID, código e quantidade são obrigatórios" }),
        { status: 400 }
      );
    }

    const blister = await db.opBoxBlister.create({
      data: { id, opBoxId, code, quantity },
    });

    return Response.json(blister);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar blister" }),
      { status: 500 }
    );
  }
}

