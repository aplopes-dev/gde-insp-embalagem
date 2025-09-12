import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/theme";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/providers/session";
import "./globals.css";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GDE - Inspeção de Embalagem",
  description: "Sistema para inspeção de embalagens com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Suspense fallback={null}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
