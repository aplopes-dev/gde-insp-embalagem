// API Route do NextAuth (App Router)
// Exporta handlers GET/POST baseados no authOptions

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

