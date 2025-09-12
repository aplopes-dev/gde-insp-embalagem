"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  admin: "Início",
  users: "Usuários",
  permissions: "Permissões",
  audit: "Auditoria",
};

export default function Breadcrumbs() {
  const pathname = usePathname() || "/admin";
  const parts = pathname.split("/").filter(Boolean);

  const items = [] as { href: string; label: string }[];
  let href = "";
  for (const p of parts) {
    href += "/" + p;
    items.push({ href, label: labels[p] || p });
  }

  return (
    <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        {items.map((it, idx) => {
          const last = idx === items.length - 1;
          return (
            <li key={it.href} className="flex items-center gap-2">
              {last ? (
                <span className="text-foreground font-medium">{it.label}</span>
              ) : (
                <Link href={it.href} className="hover:underline">{it.label}</Link>
              )}
              {!last && <span className="opacity-50">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

