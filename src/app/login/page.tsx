"use client";

// Página de Login simples com RHF + NextAuth Credentials
// Comentários e rótulos em PT-BR

import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

interface LoginForm {
  login: string; // email ou username
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
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
      setError("Credenciais inválidas. Verifique seu login e senha.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4 border p-6 rounded-md bg-white">
        <h1 className="text-xl font-semibold">Acesso ao Sistema</h1>
        <div className="space-y-1">
          <label className="block text-sm font-medium">E-mail ou Usuário</label>
          <input {...register("login", { required: true })} className="w-full border rounded px-3 py-2" placeholder="email@exemplo.com ou usuario" />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Senha</label>
          <input type="password" {...register("password", { required: true })} className="w-full border rounded px-3 py-2" placeholder="Sua senha" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white py-2 rounded">
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
        <a href="/forgot-password" className="text-sm text-blue-700 underline block text-center">Esqueci minha senha</a>
      </form>
    </div>
  );
}

