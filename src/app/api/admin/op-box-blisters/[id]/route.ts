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
    const { opBoxId, code, quantity } = await req.json();

    if (!opBoxId || !code || !quantity) {
      return new Response(
        JSON.stringify({ error: "OpBox ID, código e quantidade são obrigatórios" }),
        { status: 400 }
      );
    }

    const blister = await db.opBoxBlister.update({
      where: { id: params.id },
      data: { opBoxId, code, quantity },
    });

    return Response.json(blister);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao atualizar blister" }),
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
    await db.opBoxBlister.delete({ where: { id: params.id } });
    return Response.json({ ok: true });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao deletar blister" }),
      { status: 500 }
    );
  }
}

