import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import localFont from "next/font/local";
import { useEffect, useRef } from "react";
import { ReactBarcode } from "react-jsbarcode";

const myFont = localFont({ src: "./fonts/LibreBarcode39-Regular.ttf" });

type PrintTagProps = {
  isOpen: boolean;
  itemName: string;
  itemDescription: string;
  batchCode: string;
  printConfig: {
    barcode: string;
    quantity: number;
  };
  onOpenChange: (open: boolean) => void;
  onPrintSuccess?: (barcode: string) => void;
};

const RePrintTagDialog = ({
  isOpen,
  onOpenChange,
  onPrintSuccess,
  itemName,
  itemDescription,
  batchCode,
  printConfig,
}: PrintTagProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const printTag = () => {
    setTimeout(() => {
      const printContent = printRef.current!.innerHTML;
      enviarParaImpressao(printContent);
    }, 2000);
  };

  const enviarParaImpressao = async (divData: any) => {
    if (!printConfig) throw new Error("Falha ao carregar codigo de barras");
    const conteudoDiv = divData;
    const parsedJSON = JSON.stringify({ conteudo: conteudoDiv })

    console.log(conteudoDiv);
    

    const resposta = await fetch("/api/imprimir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: parsedJSON,
    });

    if (resposta.ok) {
      console.log("Conteúdo enviado para impressão");
      onPrintSuccess && onPrintSuccess(`${printConfig.barcode}`);
      onOpenChange(false);
    } else {
      console.error("Erro ao enviar para impressão");
    }
  };

  useEffect(() => {
    if (isOpen) {
      printTag();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiqueta</DialogTitle>
          <DialogDescription>Etiqueta para impressão</DialogDescription>
        </DialogHeader>
        <div key="tag-area" ref={printRef}>
          {printConfig && (
            <div className="tag-area">
              <div className="title no-warp-line">{itemName}</div>
              <div className="description no-warp-line">{itemDescription}</div>
              <div className="batch">Lote: {batchCode}</div>
              <div className="barcode-row">
                <ReactBarcode
                  value={`${printConfig.barcode}`}
                  options={{ format: "CODE39", height: 50 }}
                />
                <div className="quantity">
                  Quantidade: {printConfig.quantity}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RePrintTagDialog;
