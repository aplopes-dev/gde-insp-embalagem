// Rota que redefine a senha a partir de token de VerificationToken
// Comentários em PT-BR. Valida política de senha.
import { NextResponse } from "next/server";
import db from "@/providers/database";
import { hashPass } from "@/libs/bcrypt";
import { validatePasswordPolicy } from "@/shared/utils/password-policy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: string | undefined = body?.token;
    const identifier: string | undefined = body?.identifier; // email
    const password: string | undefined = body?.password;

    if (!token || !identifier || !password) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }
    const pol = validatePasswordPolicy(password);
    if (!pol.ok) {
      return NextResponse.json({ error: pol.message }, { status: 400 });
    }

    const vt = await db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });

    if (!vt || vt.expires < new Date()) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
    }

    // Atualiza senha e remove token
    const user = await db.user.findFirst({ where: { email: identifier } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const newHash = await hashPass(password);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { password: newHash } }),
      db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier,
            token,
          },
        },
      }),
      db.auditLog.create({
        data: {
          userId: user.id,
          action: "RESET_PASSWORD",
          entity: "User",
          entityId: String(user.id),
          before: {},
          after: {},
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[RESET_PASSWORD]", e);
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 });
  }
}

