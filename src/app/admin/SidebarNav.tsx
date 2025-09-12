"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/admin", label: "Início" },
  { href: "/admin/users", label: "Usuários" },
  { href: "/admin/permissions", label: "Permissões" },
  { href: "/admin/audit", label: "Auditoria" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((i) => {
        const active = pathname === i.href || pathname?.startsWith(i.href + "/");
        return (
          <Button
            key={i.href}
            asChild
            variant={active ? "secondary" : "ghost"}
            className={`w-full justify-start ${active ? "font-semibold" : ""}`}
          >
            <Link href={i.href}>{i.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}

