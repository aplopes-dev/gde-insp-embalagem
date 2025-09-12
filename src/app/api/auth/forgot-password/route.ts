// Rota de recuperação de senha: recebe login (email ou username) e envia e-mail com token
// Comentários em PT-BR. Usa modelo VerificationToken do Prisma.
import { NextResponse } from "next/server";
import db from "@/providers/database";
import { sendPasswordResetEmail } from "@/shared/services/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const login: string | undefined = body?.login;
    if (!login) return NextResponse.json({ error: "Login é obrigatório" }, { status: 400 });

    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: login.toLowerCase() },
          { username: login.toLowerCase() },
        ],
      },
    });

    // Sempre retorna sucesso para evitar enumeração de usuários
    if (!user) return NextResponse.json({ ok: true });

    // Gera token simples e grava como VerificationToken (expira em 1h)
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || `${new URL(req.url).origin}`;
    await sendPasswordResetEmail({ to: user.email, token, identifier: user.email, baseUrl });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[FORGOT_PASSWORD]", e);
    return NextResponse.json({ error: "Erro ao processar solicitação" }, { status: 500 });
  }
}
