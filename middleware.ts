import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessAdmin, canAccessHistorico } from "@/lib/rbac-roles";
import { DEVICE_ID_COOKIE, parseDeviceId } from "@/shared/utils/device-id";

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

  if (!token && !isPublic) {
    const deviceId = resolveDeviceId(req);
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
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
