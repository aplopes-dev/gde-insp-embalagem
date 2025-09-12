"use client";
export const dynamic = "force-dynamic";

// Página de Login simples com RHF + NextAuth Credentials
// Comentários e rótulos em PT-BR

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";

interface LoginForm {
  login: string; // email ou username
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<LoginForm>({
    defaultValues: { login: "", password: "" }
  });

  async function onSubmit(values: LoginForm) {
    setError(null);
    const res = await signIn("credentials", {
      login: values.login,
      password: values.password,
      redirect: false,
      callbackUrl,
    });
    if (res?.ok) {
      router.push(callbackUrl);
    } else {
      const msg = "Credenciais inválidas. Verifique seu login e senha.";
      setError(msg);
      toast({ title: "Não foi possível entrar", description: msg, variant: "destructive" as any });
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5 border p-6 rounded-lg bg-background shadow">
          <div className="flex flex-col items-center gap-2 text-center">
            <Image src="/images/logo.png" alt="GDE - Inspeção de Embalagem" width={56} height={56} className="rounded" />
            <div>
              <h1 className="text-lg font-semibold">GDE - Inspeção de Embalagem</h1>
              <p className="text-sm text-muted-foreground">Acesse sua conta para continuar</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">E-mail ou Usuário</label>
            <input {...register("login", { required: true })} className="w-full border rounded px-3 py-2" placeholder="email@exemplo.com ou usuario" />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Senha</label>
            <input type="password" {...register("password", { required: true })} className="w-full border rounded px-3 py-2" placeholder="Sua senha" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground py-2 rounded disabled:opacity-60">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
          <a href="/forgot-password" className="text-sm text-blue-700 underline block text-center">Esqueci minha senha</a>
        </form>
      </div>
    </Suspense>
  );
}

