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
    const id = parseInt(params.id);
    const { name, code, description, slots, limitPerBox } = await req.json();

    if (!name || !code) {
      return new Response(
        JSON.stringify({ error: "Nome e código são obrigatórios" }),
        { status: 400 }
      );
    }

    const blisterType = await db.blisterType.update({
      where: { id },
      data: { name, code, description, slots, limitPerBox },
    });

    return Response.json(blisterType);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao atualizar tipo de blister" }),
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
    await db.blisterType.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao deletar tipo de blister" }),
      { status: 500 }
    );
  }
}

