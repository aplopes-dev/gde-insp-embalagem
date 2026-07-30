import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import { createOpBoxFromJerp } from "@/usecases/op/create-op-box-from-jerp";
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
    error instanceof Error ? error.message : "Erro ao processar caixas";
  return new Response(JSON.stringify({ error: message }), { status: 500 });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== "SUPERVISOR") return forbidden();

  try {
    const { searchParams } = new URL(req.url);
    const opIdParam = searchParams.get("opId");
    const opCodeParam = searchParams.get("opCode")?.trim();
    const barCodeParam = searchParams.get("barCode")?.trim();
    const searchParam = searchParams.get("search")?.trim();
    const opId = opIdParam ? parseInt(opIdParam, 10) : null;

    const opBoxes = await db.opBox.findMany({
      where: {
        ...(opId && !Number.isNaN(opId) ? { opId } : {}),
        ...(opCodeParam ? { op: { code: opCodeParam } } : {}),
        ...(barCodeParam
          ? { barCode: { contains: barCodeParam, mode: "insensitive" } }
          : {}),
        ...(searchParam
          ? {
              OR: [
                { code: { contains: searchParam, mode: "insensitive" } },
                { barCode: { contains: searchParam, mode: "insensitive" } },
                { id: { contains: searchParam, mode: "insensitive" } },
                { op: { code: { contains: searchParam, mode: "insensitive" } } },
                ...(searchParam.toUpperCase() === "PENDING" ||
                searchParam.toUpperCase() === "PACKAGED" ||
                searchParam.toUpperCase() === "PACKAGED_W_BREAK"
                  ? [
                      {
                        status: searchParam.toUpperCase() as
                          | "PENDING"
                          | "PACKAGED"
                          | "PACKAGED_W_BREAK",
                      },
                    ]
                  : []),
                ...(/^\d+$/.test(searchParam)
                  ? [{ opId: parseInt(searchParam, 10) }]
                  : []),
              ],
            }
          : {}),
      },
      include: {
        OpBoxBlister: { select: { id: true, quantity: true, code: true } },
        op: { select: { code: true } },
      },
      orderBy: [{ opId: "asc" }, { code: "asc" }],
    });
    return Response.json(opBoxes);
  } catch {
    return new Response(JSON.stringify({ error: "Erro ao carregar caixas" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; email?: string } | undefined;

  if (user?.role !== "SUPERVISOR") return forbidden();

  try {
    const body = await req.json();
    const opId = Number(body.opId);
    const pieces =
      body.pieces != null && body.pieces !== ""
        ? Number(body.pieces)
        : undefined;

    if (!opId || Number.isNaN(opId)) {
      return new Response(
        JSON.stringify({ error: "opId é obrigatório" }),
        { status: 400 }
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
