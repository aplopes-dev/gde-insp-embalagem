import { authOptions } from "@/libs/auth";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/libs/password";
import db from "@/providers/database";
import { getServerSession } from "next-auth";
import { hashPass } from "@/libs/bcrypt";

function forbidden() { return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }); }

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMINISTRADOR") return forbidden();
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMINISTRADOR") return forbidden();
  const body = await req.json();
  const { name, email, password, role: userRole } = body || {};
  if (!name || !email || !password || !userRole) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return new Response(JSON.stringify({ error: PASSWORD_POLICY_MESSAGE }), { status: 400 });
  }
  const hashed = await hashPass(password);
  const user = await db.user.create({ data: { name, email, password: hashed, role: userRole } });
  return Response.json({ id: user.id });
}

