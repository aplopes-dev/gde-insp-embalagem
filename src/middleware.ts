import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login", "/api/auth", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // from_gui=1 só é aceito de localhost (Flask GUI abre o browser localmente)
  if (req.nextUrl.searchParams.get("from_gui") === "1") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";
    const isLocal = !ip || ip === "127.0.0.1" || ip === "::1";
    if (!isLocal) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.delete("from_gui");
      return NextResponse.redirect(url);
    }
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname.startsWith("/images") || pathname.startsWith("/api/images");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const callbackTarget =
      pathname === "/" ? "/dashboard" : pathname + req.nextUrl.search;
    url.searchParams.set("callbackUrl", callbackTarget);
    return NextResponse.redirect(url);
  }

  if (token && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todas as rotas exceto as internas e APIs
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};

