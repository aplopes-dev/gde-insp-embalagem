"use client";

import Header from "@/components/header";
import { Badge } from "@/components/ui/badge";
import BlisterListDialog from "@/features/blister-list-dialog";
import DailyOpBoxTable from "@/features/daily-op-box-table";
import PrintTagDialog from "@/features/print-tag-dialog/ui";
import { OpDto } from "@/types/op-dto";
import { OpStatus } from "@prisma/client";
import { useEffect, useState } from "react";
import { getOpById } from "../actions";

type PrintConfig = {
  barcode: string;
  quantity: number;
}

const BoxPage = ({
  params: { opId },
}: {
  params: {
    opId: number;
  };
}) => {
  const [data, setData] = useState<OpDto>();

  const [activeKey, setActiveKey] = useState<any>(null);
  const [openBlisterDialog, setOpenBlisterDialog] = useState<boolean>(false);
  const [openPrintTagDialog, setOpenPrintTagDialog] = useState<boolean>(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    barcode: "",
    quantity: 0,
  });

  const onCLickView = (value: any) => {
    setActiveKey(value);
    setOpenBlisterDialog(true);
  };

  const loadData = async () => {
    const opData = await getOpById(Number(opId));
    opData && setData(opData);
  };

  useEffect(() => {
    loadData();
  }, []);

  function getStatusVariant(status?: OpStatus) {
    switch (status) {
      case OpStatus.COMPLETED:
        return "success";
      case OpStatus.PENDING:
        return "default";
    }
  }

  function getStatusName(status?: OpStatus) {
    switch (status) {
      case OpStatus.COMPLETED:
        return "Concluído";
      case OpStatus.PENDING:
        return "Pendente";
    }
  }

  function onCLickPrint(value: PrintConfig) {
    setPrintConfig(value);
    setOpenPrintTagDialog(true);
  }

  return (
    <div className="h-screen flex flex-col gap-4 lg:gap-10 exl:gap-16">
      <Header />
      {data && (
        <div className="flex justify-center">
          <div className="m-2 lg:m-4 xl:m-6 exl:m-10 w-full exl:w-[80%]">
            <h1 className="text-xl xl:text-4xl uppercase font-bold">
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
                  <span className="text-blue-600">{data.box?.name}</span>
                </div>
                <div className="font-bold">
                  <span className="mr-1">Blister:</span>
                  <span className="text-blue-600">{data.blister?.name}</span>
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
            <h3 className="font-bold uppercase mt-6 px-1">Caixas</h3>
            <DailyOpBoxTable opId={opId} onClickView={onCLickView} onCLickPrint={onCLickPrint} />
            <BlisterListDialog
              opCode={data.code}
              activeKey={activeKey}
              isOpen={openBlisterDialog}
              onOpenChange={setOpenBlisterDialog}
            />
            <PrintTagDialog
              itemName={data.product.code}
              itemDescription={data.product.description || ""}
              printConfig={printConfig}
              batchCode={data.code}
              isOpen={openPrintTagDialog}
              onOpenChange={setOpenPrintTagDialog}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxPage;
