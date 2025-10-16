// lib/auth.ts
// Configuração do NextAuth (v4) com Provider de Credenciais, RBAC básico e sessão via JWT
// Comentários em PT-BR para facilitar manutenção.

import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import db from "@/providers/database";
import bcrypt from "bcrypt";
import { verifyJerpPassword } from "@/shared/services/jerp";


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
        email: { label: "Email", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").trim();
        const password = (credentials?.password || "").trim();
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        // Regra principal (IATF): validar senha no JERP a cada login
        try {
          const okJerp = await verifyJerpPassword(email, password);
          if (okJerp) {
            return {
              id: String(user.id),
              name: user.name ?? user.username,
              role: user.role,
              username: user.username,
            } as unknown as NextAuthUser;
          }
        } catch (e) {
          // Em caso de erro no JERP (timeout etc.), não autenticar silenciosamente
        }

        // Exceção: Super Admin local com senha local (único perfil com senha local)
        if (user.role === 'ADMIN' && user.password) {
          const okLocal = await bcrypt.compare(password, user.password);
          if (okLocal) {
            return {
              id: String(user.id),
              name: user.name ?? user.username,
              role: user.role,
              username: user.username,
            } as unknown as NextAuthUser;
          }
        }

        return null;
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

