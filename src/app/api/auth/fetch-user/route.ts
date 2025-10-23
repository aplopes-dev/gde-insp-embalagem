import { fetchUserFromJerp } from "@/services/jerp-auth";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
      });
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

