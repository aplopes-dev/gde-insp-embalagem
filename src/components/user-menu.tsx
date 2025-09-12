"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";

function roleLabel(r?: string) {
  const map: Record<string, string> = {
    OPERATOR: "Operador",
    SUPERVISOR: "Supervisor",
    ADMIN: "Administrador",
  };
  return r ? (map[r] || r) : "";
}

function initialsFrom(name?: string) {
  const n = (name || "Usuário").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { data, status } = useSession();
  const rawName = (data?.user as any)?.name || (data?.user as any)?.username || "Usuário";
  const role = (data?.user as any)?.role as string | undefined;
  const name = String(rawName);

  if (status === "loading") return null;
  if (status === "unauthenticated") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Menu do usuário" className="inline-flex items-center">
          <Badge variant="secondary" className="flex items-center gap-2 pl-1.5 pr-2 py-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
              {initialsFrom(name)}
            </span>
            <span className="max-w-[10rem] truncate">{name}</span>
            {role && (
              <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                {roleLabel(role)}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          Conectado como: {name}
          {role ? ` (${roleLabel(role)})` : ""}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/admin">
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" /> Ir para o perfil (Admin)
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Encerrar sessão
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

