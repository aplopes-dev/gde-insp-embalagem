"use client";

import Header from "@/app/_components/header";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { syncAndGetOpToProduceByCode } from "./actions";

export default function PackagingInspection({
  params: { code },
}: {
  params: {
    code: string;
  };
}) {
  const [data, setData] = useState();

  const loadData = async () => {
    const opData = await syncAndGetOpToProduceByCode(code).catch(console.error);
  };

  useEffect(() => {
    loadData().catch((err: Error) => {
      toast({
        title: "Erro",
        description: err.message,
      });
    });
  }, []);

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      <div className="container flex flex-col gap-6 lg:gap-16"></div>
    </div>
  );
}
