import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessAdmin, canAccessHistorico } from "@/lib/rbac-roles";

const PUBLIC_PATHS = ["/login", "/api/auth", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api/images");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as { role?: unknown } | null)?.role;

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(url);
  }

  if (token && pathname === "/login") {
    const url = req.nextUrl.clone();
    // AUDITOR também opera inspeção — home padrão como OPERADOR.
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Histórico: exclusivo AUDITOR (extra face ao OPERADOR)
  if (pathname.startsWith("/historico") && !canAccessHistorico(role)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Admin: exclusivo SUPERVISOR
  if (pathname.startsWith("/admin") && !canAccessAdmin(role)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todas as rotas de página (APIs ficam de fora — gate via requireRole)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
