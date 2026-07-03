import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import db from "@/providers/database";
import logger from "@/libs/logger";
import {
  reconcileOpWithJerp,
  reconcileOpenOpsWithJerp,
} from "@/usecases/op/reconcile-op-with-jerp";

type ReconcileBody = {
  opId?: number;
  autoCorrect?: boolean;
};

/**
 * Item 7: reconciliação periódica com o JERP.
 * - Sem `opId`: reconcilia todas as OPs abertas.
 * - Com `opId`: reconcilia apenas a OP informada.
 * `autoCorrect` (default true) ajusta o interno ao JERP quando diverge.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || !session.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    const userId = user?.id ?? null;

    const body = (await req.json().catch(() => ({}))) as ReconcileBody;
    const autoCorrect = body.autoCorrect ?? true;

    if (body.opId != null) {
      const result = await reconcileOpWithJerp(Number(body.opId), userId, {
        autoCorrect,
      });
      return NextResponse.json({ results: [result] });
    }

    const results = await reconcileOpenOpsWithJerp(userId, { autoCorrect });
    const divergences = results.filter((r) => r.diverged).length;

    return NextResponse.json({
      total: results.length,
      divergences,
      results,
    });
  } catch (error) {
    logger.error({ message: "Falha na reconciliação com o JERP.", error });
    return NextResponse.json(
      { error: "Erro ao reconciliar com o JERP" },
      { status: 500 }
    );
  }
}
