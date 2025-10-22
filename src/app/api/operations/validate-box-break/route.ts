import db from "@/providers/database";
import { isSamePass } from "@/libs/bcrypt";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "E-mail e senha obrigatorios" }), { status: 400 });
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return new Response(JSON.stringify({ error: "CADASTRO INVALIDO." }), { status: 401 });
  const ok = await isSamePass(password, user.password);
  if (!ok) return new Response(JSON.stringify({ error: "CADASTRO INVALIDO." }), { status: 401 });
  if (user.role !== "SUPERVISOR") {
    return new Response(JSON.stringify({ error: "CADASTRO INVALIDO." }), { status: 403 });
  }
  return Response.json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
}

