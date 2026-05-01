"use client";

import Header from "@/components/header";
import DailyOpList from "@/features/daily-op-list";
import OpLoadForm from "@/features/op-load-form";
import RequireAuth from "@/components/require-auth";
import { Suspense } from "react";

export default function Home() {
  return (
    <RequireAuth>
      <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
        <Header />
        <div className="container flex flex-col gap-6 lg:gap-16">
          <h1 className="text-xl xl:text-4xl exl:text-8xl uppercase font-bold text-center">
            Insira o ID da OP
          </h1>
          <Suspense fallback={<div className="text-center text-muted-foreground">A carregar…</div>}>
            <OpLoadForm />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <DailyOpList />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
