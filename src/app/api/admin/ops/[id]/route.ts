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
    const { code, quantityToProduce, status } = await req.json();

    if (!code || !quantityToProduce) {
      return new Response(
        JSON.stringify({ error: "Código e quantidade são obrigatórios" }),
        { status: 400 }
      );
    }

    const op = await db.op.update({
      where: { id },
      data: { code, quantityToProduce, status },
    });

    return Response.json(op);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao atualizar OP" }),
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
    const id = parseInt(params.id);
    await db.op.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao deletar OP" }),
      { status: 500 }
    );
  }
}

