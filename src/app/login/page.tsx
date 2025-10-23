"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import Image from "next/image";

type LoginStep = "email" | "password";

interface UserInfo {
  email: string;
  nome: string;
  lideranca: boolean;
}

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/";

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Passo 1: Buscar usuário no JERP pelo email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !email.includes("@")) {
        setError("E-mail inválido");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/fetch-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.status === 404) {
        setError("E-mail não encontrado no JERP");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Erro ao conectar com JERP");
        setLoading(false);
        return;
      }

      const user = await response.json();
      setUserInfo(user);
      setStep("password");
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
      setError("Erro ao conectar com JERP. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Passo 2: Validar senha e fazer login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!password) {
        setError("Senha obrigatória");
        setLoading(false);
        return;
      }

      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.ok) {
        router.push(callbackUrl);
      } else {
        setError("Senha incorreta. Tente novamente.");
        setPassword("");
      }
    } catch (err) {
      console.error("Erro durante login:", err);
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setPassword("");
    setError("");
    setUserInfo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Botão de Tema no Canto Superior Direito */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeModeToggle />
      </div>

      <form
        onSubmit={step === "email" ? handleEmailSubmit : handlePasswordSubmit}
        className="w-full max-w-sm space-y-6"
      >
        <div className="flex justify-center mb-8">
          <div className="w-48 h-48 relative">
            <Image
              src="/images/logo.png"
              alt="GDE Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center">Entrar</h1>

        {/* Passo 1: Email */}
        {step === "email" && (
          <>
            <div>
              <Input
                placeholder="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? "Buscando..." : "Continuar"}
            </Button>
          </>
        )}

        {/* Passo 2: Senha */}
        {step === "password" && userInfo && (
          <>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{userInfo.nome}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Cargo: <span className="font-semibold">{userInfo.lideranca ? "Supervisor" : "Operador"}</span>
              </p>
            </div>

            <div>
              <Input
                placeholder="Senha do JERP/MANAIA"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Autenticando..." : "Entrar"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleBackToEmail}
              disabled={loading}
            >
              Voltar
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}

