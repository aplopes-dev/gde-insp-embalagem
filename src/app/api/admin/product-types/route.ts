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
    const productTypes = await db.productType.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(productTypes);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao carregar produtos" }), {
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

    const productType = await db.productType.create({
      data: { id, name, code, description },
    });

    return Response.json(productType);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao criar produto" }),
      { status: 500 }
    );
  }
}

