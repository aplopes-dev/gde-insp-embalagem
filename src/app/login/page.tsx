"use client";
export const dynamic = "force-dynamic";

// Login por Inscrição com fluxo de primeiro acesso via JERP

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

interface JerpUser {
  inscription: string;
  nome: string;
  cargo: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/";

  const [inscription, setInscription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmUser, setConfirmUser] = useState<JerpUser | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // Step 2 (LOCAL): já sabemos que existe usuário local, agora validar senha
      if (needsPassword) {
        if (!password.trim()) { setError("Informe a senha."); return; }
        const resSign = await signIn("credentials", { inscription, password, redirect: false, callbackUrl });
        if (resSign?.ok) router.push(callbackUrl);
        else setError("Falha ao iniciar sessão");
        return;
      }

      // Step 1: verificar inscrição
      const res = await fetch("/api/auth/inscricao-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inscription }),
      });
      if (res.status === 404) {
        setError("usuario não encontrado no sistema interno, contacre o suporte");
        return;
      }
      if (!res.ok) throw new Error("Falha no login");
      const data = await res.json();
      if (data.status === "LOCAL") {
        // Agora mostrar o campo senha (step 2)
        setNeedsPassword(true);
        return;
      } else if (data.status === "JERP" && data.user) {
        setConfirmUser(data.user as JerpUser);
      } else {
        setError("Resposta inesperada do servidor");
      }
    } catch (e: any) {
      setError(e.message || "Erro inesperado");
    } finally {
      setPending(false);
    }
  }

  async function handleConfirm() {
    if (!confirmUser) return;
    setError(null);
    setPending(true);
    try {
      if (!password.trim()) { setError("Informe a senha."); return; }
      const res = await fetch("/api/auth/confirm-jerp-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...confirmUser, password }),
      });
      if (!res.ok) {
        let msg = "Falha ao confirmar cadastro";
        try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
        throw new Error(msg);
      }
      const resSign = await signIn("credentials", { inscription: confirmUser.inscription, password, redirect: false, callbackUrl });
      if (resSign?.ok) router.push(callbackUrl);
      else setError("Falha ao iniciar sessão");
    } catch (e: any) {
      setError(e.message || "Erro inesperado");
    } finally {
      setPending(false);
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <div className="w-full max-w-sm space-y-5 border p-6 rounded-lg bg-background shadow">
          <div className="flex flex-col items-center gap-2 text-center">
            <Image src="/images/logo.png" alt="GDE - Inspeção de Embalagem" width={56} height={56} className="rounded" />
            <div>
              <h1 className="text-lg font-semibold">GDE - Inspeção de Embalagem</h1>
              <p className="text-sm text-muted-foreground">Informe sua inscrição para entrar</p>
            </div>
          </div>

          {!confirmUser ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">Inscrição</label>
                <input value={inscription} onChange={(e) => { setInscription(e.target.value); if (needsPassword) setNeedsPassword(false); }} className="w-full border rounded px-3 py-2" placeholder="Digite sua inscrição" />
              </div>
              {needsPassword && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Digite sua senha"
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={pending || !inscription.trim()} className="w-full bg-primary text-primary-foreground py-2 rounded disabled:opacity-60">
                {pending ? (needsPassword ? "Entrando..." : "Verificando...") : (needsPassword ? "Entrar" : "Verificar")}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Inscrição</div>
                <div className="border rounded px-3 py-2 bg-muted/30">{confirmUser.inscription}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Nome</div>
                <div className="border rounded px-3 py-2 bg-muted/30">{confirmUser.nome}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Cargo</div>
                <div className="border rounded px-3 py-2 bg-muted/30">{confirmUser.cargo}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Senha (JERP/MANAIA)</div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Digite a mesma senha do JERP/MANAIA" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={handleConfirm} disabled={pending} className="w-full bg-primary text-primary-foreground py-2 rounded disabled:opacity-60">
                {pending ? "Salvando..." : "Confirmar e entrar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Suspense>
  );
}

