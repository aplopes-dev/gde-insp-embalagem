import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { deleteOpBoxAndReconcile } from "@/usecases/op/delete-op-box-and-reconcile";
import { AdminBoxError } from "@/usecases/op/admin-box-errors";

function forbidden() {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}

function errorResponse(error: unknown) {
  if (error instanceof AdminBoxError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        details: error.details,
      }),
      { status: error.status }
    );
  }
  const message =
    error instanceof Error ? error.message : "Erro ao processar caixa";
  return new Response(JSON.stringify({ error: message }), { status: 500 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; boxId: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; email?: string } | undefined;

  if (user?.role !== "SUPERVISOR") return forbidden();

  const opId = parseInt(params.id, 10);
  if (Number.isNaN(opId)) {
    return new Response(JSON.stringify({ error: "OP ID inválido" }), {
      status: 400,
    });
  }

  try {
    let confirmJerpReversal = false;
    try {
      const body = await req.json();
      confirmJerpReversal = Boolean(body?.confirmJerpReversal);
    } catch {
      // sem body
    }

    const box = await db.opBox.findUnique({ where: { id: params.boxId } });
    if (!box || box.opId !== opId) {
      return new Response(
        JSON.stringify({ error: "Caixa não encontrada nesta OP" }),
        { status: 404 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { email: user.email! },
    });
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
      });
    }

    const result = await deleteOpBoxAndReconcile({
      boxId: params.boxId,
      userId: dbUser.id,
      confirmJerpReversal,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
