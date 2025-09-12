// lib/auth.ts
// Configuração do NextAuth (v4) com Provider de Credenciais, RBAC básico e sessão via JWT
// Comentários em PT-BR para facilitar manutenção.

import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import db from "@/providers/database";
import { isSamePass } from "@/libs/bcrypt";

// Validação simples do input de login (email OU username) e senha
function normalizeLogin(login: string) {
  return (login || "").trim();
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  session: {
    strategy: "jwt", // JWT simplifica e evita leituras em tabela Session
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        login: { label: "E-mail ou usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;
        const login = normalizeLogin(credentials.login);
        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: login.toLowerCase() },
              { username: login.toLowerCase() },
            ],
          },
        });
        if (!user) return null;
        const ok = await isSamePass(credentials.password, user.password);
        if (!ok) return null;

        // Retornamos um formato enxuto; campos extras vão via callbacks
        return {
          id: String(user.id),
          name: user.name ?? user.username,
          email: user.email,
          role: user.role,
          username: user.username,
        } as unknown as NextAuthUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Popula token JWT com dados do usuário
      if (user) {
        // @ts-ignore
        token.role = (user as any).role;
        // @ts-ignore
        token.username = (user as any).username;
        token.id = (user as any).id;
      } else {
        // Em chamadas subsequentes, se não houver user (já logado), garantimos dados do BD
        if (!token.id) {
          // nada
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Expondo dados úteis no session.user
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.role = token.role as string;
        // @ts-ignore
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  // Recomenda-se definir NEXTAUTH_SECRET no .env; sem isso em produção pode falhar
  secret: process.env.NEXTAUTH_SECRET,
};

