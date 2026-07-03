import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const id = parseInt(params.id);
    const { name, code, description } = await req.json();

    if (!name || !code) {
      return new Response(
        JSON.stringify({ error: "Nome e código são obrigatórios" }),
        { status: 400 }
      );
    }

    const productType = await db.productType.update({
      where: { id },
      data: { name, code, description },
    });

    return Response.json(productType);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao atualizar produto" }),
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const id = parseInt(params.id);
    await db.productType.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao deletar produto" }),
      { status: 500 }
    );
  }
}

