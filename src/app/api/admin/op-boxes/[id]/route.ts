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

  if (role !== "ADMINISTRADOR") return forbidden();

  try {
    const { opId, code, status } = await req.json();

    if (!opId || !code) {
      return new Response(
        JSON.stringify({ error: "OP ID e código são obrigatórios" }),
        { status: 400 }
      );
    }

    const opBox = await db.opBox.update({
      where: { id: params.id },
      data: { opId, code, status },
    });

    return Response.json(opBox);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao atualizar caixa" }),
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

  if (role !== "ADMINISTRADOR") return forbidden();

  try {
    await db.opBox.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao deletar caixa" }),
      { status: 500 }
    );
  }
}

