import { authOptions } from "@/libs/auth";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/libs/password";
import db from "@/providers/database";
import { getServerSession } from "next-auth";
import { hashPass } from "@/libs/bcrypt";

function forbidden() { return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }); }

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMINISTRADOR") return forbidden();
  const body = await req.json();
  const { name, email, password, role: userRole } = body || {};
  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (userRole) data.role = userRole;
  if (password) {
    if (!isStrongPassword(password)) {
      return new Response(JSON.stringify({ error: PASSWORD_POLICY_MESSAGE }), { status: 400 });
    }
    data.password = await hashPass(password);
  }
  await db.user.update({ where: { id: params.id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMINISTRADOR") return forbidden();
  await db.user.delete({ where: { id: params.id } });
  return Response.json({ ok: true });
}

