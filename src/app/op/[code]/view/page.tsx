"use client";

import { OpDto } from "@/app/(home)/_types/op-dto";
import Header from "@/app/_components/header";
import { useEffect, useState } from "react";
import { getOpByCode } from "../actions";
import { DailyOpBoxTable } from "./_components/daily-op-box-table";
import { Badge } from "@/components/ui/badge";

const BoxPage = ({
  params: { code },
}: {
  params: {
    code: string;
  };
}) => {
  const [data, setData] = useState<OpDto>();

  const loadData = async () => {
    const opData = await getOpByCode(code);
    opData && setData(opData);
  };

  useEffect(() => {
    loadData();
  }, []);

  function getStatusVariant(status?: number) {
    switch (status) {
      case 1:
        return "success";
      case 2:
        return "destructive";
      default:
        return "secondary";
    }
  }

  function getStatusName(status?: number) {
    switch (status) {
      case 1:
        return "Concluído";
      case 2:
        return "Quebra de OP";
      default:
        return "Pendente";
    }
  }

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      {data && (
        <div className="flex justify-center">
          <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%]">
            <h1 className="text-xl xl:text-4xl exl:text-8xl uppercase font-bold">
              Detalhes da OP
            </h1>
            <div className="flex flex-col md:flex-row md:gap-4">
              <div className="flex flex-col p-1 gap-2 uppercase w-1/2 md:w-auto mt-4">
                <div className="font-bold">
                  <span className="mr-1">Código da OP:</span>
                  <span className="text-blue-600">{data.code}</span>
                </div>
                <div className="font-bold">
                  <span className="font-bold mr-1">Itens:</span>
                  <span className="text-blue-600">
                    {data.quantityToProduce}
                  </span>
                </div>
                <div className="font-bold">
                  <span className="mr-1">Caixa:</span>
                  <span className="text-blue-600">{data.box.name}</span>
                </div>
                <div className="font-bold">
                  <span className="mr-1">Blister:</span>
                  <span className="text-blue-600">{data.blister.name}</span>
                </div>
              </div>

              <div className="flex flex-col p-1 gap-2 uppercase w-1/2 md:w-auto mt-4">
                <div>
                  <span className="font-bold mr-1">Início:</span>
                  <span>
                    {data.createdAt.toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="font-bold mr-1">Fim:</span>
                  <span>
                    {data.finishedAt?.toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                    }) || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-bold mr-1">Status:</span>
                  <Badge variant={getStatusVariant(data.status)}>
                    {getStatusName(data.status)}
                  </Badge>
                </div>
              </div>
            </div>
            <DailyOpBoxTable opId={data.id} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxPage;
