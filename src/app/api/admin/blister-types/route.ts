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
    const blisterTypes = await db.blisterType.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(blisterTypes);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao carregar tipos de blister" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "ADMINISTRADOR") return forbidden();

  try {
    const { id, name, code, description, slots, limitPerBox } = await req.json();

    if (!id || !name || !code) {
      return new Response(
        JSON.stringify({ error: "ID, nome e código são obrigatórios" }),
        { status: 400 }
      );
    }

    const blisterType = await db.blisterType.create({
      data: { id, name, code, description, slots, limitPerBox },
    });

    return Response.json(blisterType);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar tipo de blister" }),
      { status: 500 }
    );
  }
}

