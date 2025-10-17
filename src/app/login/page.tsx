"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from "@/libs/password";
import Image from "next/image";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória").refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/";

  const form = useForm<FormData>({ resolver: zodResolver(schema), mode: "onChange" });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (data) => {
    const res = await signIn("credentials", { redirect: false, email: data.email, password: data.password });
    if (res?.ok) {
      router.push(callbackUrl);
    } else {
      toast({ title: "Erro", description: "CADASTRO INVÁLIDO.", variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
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
        <div>
          <Input placeholder="E-mail" type="email" {...register("email")} />
          {formState.errors.email && (<p className="text-red-600 text-sm">{formState.errors.email.message}</p>)}
        </div>
        <div>
          <Input placeholder="Senha" type="password" {...register("password")} />
          {formState.errors.password && (<p className="text-red-600 text-sm">{formState.errors.password.message}</p>)}
        </div>
        <Button type="submit" className="w-full" disabled={!formState.isValid || formState.isSubmitting}>Entrar</Button>
      </form>
    </div>
  );
}

