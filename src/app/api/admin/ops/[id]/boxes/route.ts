import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { getOpFromId } from "@/shared/services/jerp";
import { createOpBoxFromJerp } from "@/usecases/op/create-op-box-from-jerp";
import { AdminBoxError } from "@/usecases/op/admin-box-errors";
import { computeInternalPending } from "@/usecases/op-jerp/assert-box-capacity-vs-jerp";

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
    error instanceof Error ? error.message : "Erro ao processar caixas";
  return new Response(JSON.stringify({ error: message }), { status: 500 });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  const opId = parseInt(params.id, 10);
  if (Number.isNaN(opId)) {
    return new Response(JSON.stringify({ error: "OP ID inválido" }), {
      status: 400,
    });
  }

  try {
    const op = await db.op.findUnique({
      where: { id: opId },
      include: {
        blister: true,
        OpBox: {
          include: {
            OpBoxBlister: {
              select: { id: true, quantity: true, code: true, packedAt: true },
            },
          },
          orderBy: { code: "asc" },
        },
      },
    });

    if (!op) {
      return new Response(JSON.stringify({ error: "OP não encontrada" }), {
        status: 404,
      });
    }

    let jerpRemaining: number | null = null;
    let jerpError: string | null = null;
    const jerp = await getOpFromId(String(opId));
    if (jerp.isRight()) {
      jerpRemaining = jerp.get().quantidadeAProduzir ?? 0;
    } else {
      jerpError = jerp.getLeft().error;
    }

    const internalPending = computeInternalPending(op.OpBox);
    const boxes = op.OpBox.map((box) => ({
      id: box.id,
      opId: box.opId,
      code: box.code,
      status: box.status,
      createdAt: box.createdAt,
      packedAt: box.packedAt,
      barCode: box.barCode,
      barCodeGeneratedAt: box.barCodeGeneratedAt,
      pieces: box.OpBoxBlister.reduce((s, bl) => s + bl.quantity, 0),
      blisterCount: box.OpBoxBlister.length,
    }));

    return Response.json({
      opId: op.id,
      opCode: op.code,
      jerpRemaining,
      jerpError,
      internalPending,
      fullBoxPieces:
        op.blister?.slots && op.blister?.limitPerBox
          ? op.blister.slots * op.blister.limitPerBox
          : null,
      boxes,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
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
    const body = await req.json().catch(() => ({}));
    const pieces =
      body.pieces != null && body.pieces !== ""
        ? Number(body.pieces)
        : undefined;

    const dbUser = await db.user.findUnique({
      where: { email: user.email! },
    });
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
      });
    }

    const result = await createOpBoxFromJerp({
      opId,
      userId: dbUser.id,
      pieces: pieces != null && !Number.isNaN(pieces) ? pieces : undefined,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
