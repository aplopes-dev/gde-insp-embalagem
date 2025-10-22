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
    const boxTypes = await db.boxType.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(boxTypes);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao carregar tipos de caixa" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const { id, name, code, description } = await req.json();

    if (!id || !name || !code) {
      return new Response(
        JSON.stringify({ error: "ID, nome e código são obrigatórios" }),
        { status: 400 }
      );
    }

    const boxType = await db.boxType.create({
      data: { id, name, code, description },
    });

    return Response.json(boxType);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar tipo de caixa" }),
      { status: 500 }
    );
  }
}

