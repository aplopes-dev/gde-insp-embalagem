import { DEV_BYPASS_EMAIL_SET } from "@/libs/auth-dev-bypass";
import db from "@/providers/database";
import { fetchUserFromJerp } from "@/services/jerp-auth";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
      });
    }

    const emailNorm = String(email).trim().toLowerCase();

    if (
      process.env.AUTH_DEV_BYPASS === "true" &&
      DEV_BYPASS_EMAIL_SET.has(emailNorm)
    ) {
      const local = await db.user.findUnique({
        where: { email: emailNorm },
      });
      if (!local?.password) {
        return new Response(
          JSON.stringify({
            error:
              "Utilizador bypass não encontrado na base. Execute npm run seed:bypass.",
          }),
          { status: 404 }
        );
      }
      return new Response(
        JSON.stringify({
          email: local.email,
          nome: local.name,
          isLideranca: local.role === "SUPERVISOR",
          isValid: true,
        }),
        { status: 200 }
      );
    }

    const user = await fetchUserFromJerp(email);

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error: any) {
    console.error("[API] Erro ao buscar usuário:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao buscar usuário no JERP",
      }),
      { status: 500 }
    );
  }
}

