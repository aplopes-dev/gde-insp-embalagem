import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useRef } from "react";

type PrintTagProps = {
  isOpen: boolean;
  printConfig: {
    pdfBase64: string | null;
    quantity: number;
  };
  onOpenChange: (open: boolean) => void;
  onPrintSuccess?: (barcode: string) => void;
};

const PrintTagDialog = ({
  isOpen,
  onOpenChange,
  onPrintSuccess,
  printConfig,
}: PrintTagProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const printTag = () => {
    setTimeout(() => {
      if (printConfig.pdfBase64) {
        enviarPdfParaImpressao(printConfig.pdfBase64);
      }
    }, 1000);
  };

  const enviarPdfParaImpressao = async (pdfBase64: string) => {
    const resposta = await fetch("/api/imprimir-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pdfBase64 }),
    });

    if (resposta.ok) {
      console.log("PDF enviado para impressão");
      onPrintSuccess && onPrintSuccess(`${printConfig.quantity}`);
      onOpenChange(false);
    } else {
      console.error("Erro ao enviar PDF para impressão");
    }
  };

  useEffect(() => {
    if (isOpen && printConfig.pdfBase64) {
      printTag();
    }
  }, [isOpen, printConfig.pdfBase64]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Etiqueta</DialogTitle>
          <DialogDescription>Etiqueta para impressão</DialogDescription>
        </DialogHeader>
        <div ref={printRef} className="flex justify-center">
          {printConfig.pdfBase64 ? (
            <embed
              src={`data:application/pdf;base64,${printConfig.pdfBase64}`}
              width="500"
              height="400"
              type="application/pdf"
              className="border rounded"
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500">
              Carregando preview da etiqueta...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagDialog;
