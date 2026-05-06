import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  DEV_BYPASS_EMAIL_SET,
} from "@/libs/auth-dev-bypass";
import { isSamePass } from "@/libs/bcrypt";
import db from "@/providers/database";
import { verifyPasswordWithJerp, fetchUserFromJerp, mapJerpRoleToSystemRole } from "@/services/jerp-auth";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const emailNorm = credentials.email.trim().toLowerCase();
          if (
            process.env.AUTH_DEV_BYPASS === "true" &&
            DEV_BYPASS_EMAIL_SET.has(emailNorm)
          ) {
            const user = await db.user.findUnique({
              where: { email: emailNorm },
            });
            if (user?.password) {
              const ok = await isSamePass(
                credentials.password,
                user.password
              );
              if (ok) {
                return {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                } as any;
              }
            }
            return null;
          }

          // Passo 1: Buscar usuário no JERP
          const jerpUser = await fetchUserFromJerp(credentials.email);
          if (!jerpUser) {
            console.log("[Auth] Usuário não encontrado no JERP:", credentials.email);
            return null;
          }

          // Passo 2: Validar senha no JERP
          const passwordValid = await verifyPasswordWithJerp(credentials.email, credentials.password);
          if (!passwordValid) {
            console.log("[Auth] Senha inválida para:", credentials.email);
            return null;
          }

          // Passo 3: Mapear role do JERP para o sistema
          const role = mapJerpRoleToSystemRole(jerpUser.isLideranca);

          // Passo 4: Persistir/atualizar usuário localmente
          let user = await db.user.findUnique({ where: { email: credentials.email } });

          if (!user) {
            // Criar novo usuário
            user = await db.user.create({
              data: {
                email: credentials.email,
                name: jerpUser.nome,
                role: role,
                password: "", // Não armazenamos senha localmente
              },
            });
            console.log("[Auth] Novo usuário criado:", credentials.email);
          } else {
            // Atualizar dados do usuário (nome e role podem ter mudado no JERP)
            user = await db.user.update({
              where: { email: credentials.email },
              data: {
                name: jerpUser.nome,
                role: role,
              },
            });
            console.log("[Auth] Usuário atualizado:", credentials.email);
          }

          return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
        } catch (error) {
          console.error("[Auth] Erro durante autenticação:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        // @ts-ignore
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // @ts-ignore
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.role = token.role as any;
      }
      return session;
    },
  },
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPERVISOR" | "OPERADOR";
};

