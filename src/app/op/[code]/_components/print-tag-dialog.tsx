import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import localFont from "next/font/local";
import { useEffect, useRef, useState } from "react";
import { getBarcodeFromOpId } from "../actions";
import { Button } from "@/components/ui/button";
import { PDFDocument, rgb } from "pdf-lib";

const myFont = localFont({ src: "./fonts/LibreBarcode39-Regular.ttf" });

type PrintTagProps = {
  isOpen: boolean;
  opId: number;
  itemName: string;
  itemDescription: string;
  batchCode: string;
  quantity: number;
  onOpenChange: (open: boolean) => void;
};

type PrintTagJerpData = {
  message: string;
  id: number;
  quantidadeApontada: number;
  idBarras: number;
};

const PrintTagDialog = ({
  isOpen,
  onOpenChange,
  itemName,
  itemDescription,
  batchCode,
  quantity,
  opId,
}: PrintTagProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PrintTagJerpData>();

  const loadData = async () => {
    const tagData: PrintTagJerpData = await getBarcodeFromOpId(opId, quantity);
    setData(tagData);
    setTimeout(() => {
      const printContent = printRef.current!.innerHTML;
      enviarParaImpressao(printContent);
      onOpenChange(false);
    }, 2000);
  };

  const enviarParaImpressao = async (data: any) => {
    const conteudoDiv = data;

    const resposta = await fetch("/api/imprimir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ conteudo: conteudoDiv }),
    });

    if (resposta.ok) {
      console.log("Conteúdo enviado para impressão");
    } else {
      console.error("Erro ao enviar para impressão");
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setData(undefined);
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
          {data && (
            <div className="tag-area">
              <div className="title">{itemName}</div>
              <div className="description">{itemDescription}</div>
              <div className="batch">Lote: {batchCode}</div>
              <div className="barcode-row">
                <div className={myFont.className + " barcode"}>
                  {data.idBarras}
                </div>
                <div className="quantity">Quantidade: {quantity}</div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagDialog;
