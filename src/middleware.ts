import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessAdmin, canAccessHistorico } from "@/lib/rbac-roles";
import { DEVICE_ID_COOKIE, parseDeviceId } from "@/shared/utils/device-id";
import {
  SOCKET_URL_COOKIE,
  SOCKET_URL_MAX_AGE_SEC,
  parseSocketOrigin,
} from "@/shared/utils/socket-url";

const PUBLIC_PATHS = ["/login", "/api/auth", "/favicon.ico"];

function resolveDeviceId(req: NextRequest): string | undefined {
  return (
    parseDeviceId(req.nextUrl.searchParams.get("deviceId")) ||
    parseDeviceId(req.cookies.get(DEVICE_ID_COOKIE)?.value)
  );
}

function applyDeviceCookie(res: NextResponse, deviceId: string) {
  res.cookies.set(DEVICE_ID_COOKIE, deviceId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

/**
 * `?ws=` da GUI do Server 02: grava já no cookie. No redirect para o login o parâmetro
 * deixa de estar no topo do URL e a tela de inspeção (onde nasce o socket) é outra página.
 */
function applySocketCookie(req: NextRequest, res: NextResponse) {
  if (!req.nextUrl.searchParams.has("ws")) return;
  const origin = parseSocketOrigin(req.nextUrl.searchParams.get("ws"));
  if (origin) {
    res.cookies.set(SOCKET_URL_COOKIE, origin, {
      path: "/",
      maxAge: SOCKET_URL_MAX_AGE_SEC,
      sameSite: "lax",
    });
  } else {
    res.cookies.delete(SOCKET_URL_COOKIE);
  }
}

function redirectWithDevice(
  req: NextRequest,
  pathname: string,
  searchParams?: URLSearchParams
) {
  const deviceId = resolveDeviceId(req);
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = searchParams ? `?${searchParams.toString()}` : "";
  if (deviceId) url.searchParams.set("deviceId", deviceId);
  const res = NextResponse.redirect(url);
  if (deviceId) applyDeviceCookie(res, deviceId);
  applySocketCookie(req, res);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api/images");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as { role?: unknown } | null)?.role;
  const deviceId = resolveDeviceId(req);

  if (!token && !isPublic) {
    const callbackUrl = req.nextUrl.clone();
    if (deviceId) callbackUrl.searchParams.set("deviceId", deviceId);
    const loginParams = new URLSearchParams();
    loginParams.set("callbackUrl", callbackUrl.pathname + callbackUrl.search);
    return redirectWithDevice(req, "/login", loginParams);
  }

  if (token && pathname === "/login") {
    const rawCallback = req.nextUrl.searchParams.get("callbackUrl") || "/";
    let destPath = "/";
    let destSearch = new URLSearchParams();
    try {
      const cb = new URL(rawCallback, req.nextUrl.origin);
      if (cb.origin === req.nextUrl.origin) {
        destPath = cb.pathname || "/";
        destSearch = cb.searchParams;
      }
    } catch {
      destPath = "/";
    }
    return redirectWithDevice(req, destPath, destSearch);
  }

  if (pathname.startsWith("/historico") && !canAccessHistorico(role)) {
    return redirectWithDevice(req, "/");
  }

  if (pathname.startsWith("/admin") && !canAccessAdmin(role)) {
    return redirectWithDevice(req, "/");
  }

  const res = NextResponse.next();
  const fromQuery = parseDeviceId(req.nextUrl.searchParams.get("deviceId"));
  if (fromQuery) applyDeviceCookie(res, fromQuery);
  applySocketCookie(req, res);
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
