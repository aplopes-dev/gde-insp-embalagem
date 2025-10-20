"use client";

import Image from "next/image";
import { ThemeModeToggle } from "./theme-mode-toggle";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

const Header = () => {
  const { data, status } = useSession();

  // Prefer data.user; fallback to data.session.user (safety)
  const sessionUser = (data as any)?.user ?? (data as any)?.session?.user ?? null;
  const user = status === "authenticated" ? (sessionUser as any) : null;
  const isAdmin = (user as any)?.role === "ADMINISTRADOR";

  useEffect(() => {
    console.log("[Header] Session status:", status);
    console.log("[Header] Session data:", data);
    console.log("[Header] User from session:", user);
  }, [status, data, user]);

  return (
    <header className="w-full h-12 xl:h-16 exl:h-24 p-2 xl:p-6 flex justify-between items-center">
      <Link href="/" title="Início">
        <div className="w-24 xl:w-28 exl:w-40 h-12 xl:h-14 exl:h-20 relative">
          <Image
            sizes="(max-width: 245px) 100vw, (max-width: 650px) 50vw, 33vw"
            fill
            src={`/images/logo.png`}
            alt="GDE"
          />
        </div>
      </Link>
      <div className="flex items-center gap-3">
        {user?.name && (user as any)?.role && (
          <span className="text-sm font-semibold">{user.name} - {(user as any).role}</span>
        )}
        {status === "loading" && (
          <span className="text-sm text-gray-500">Carregando...</span>
        )}
        <ThemeModeToggle />
        {isAdmin && (
          <>
            <Link
              href="/users"
              className="border px-3 py-1 rounded text-sm bg-green-500 text-white hover:bg-green-600 transition-colors"
              title="Gerenciar usuários"
            >
              Usuários
            </Link>
            <Link
              href="/admin"
              className="border px-3 py-1 rounded text-sm bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              title="Painel de administração"
            >
              Admin
            </Link>
          </>
        )}
        {status === "authenticated" && (
          <button className="border px-2 py-1 rounded text-sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sair
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
