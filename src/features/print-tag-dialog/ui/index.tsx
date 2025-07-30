import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useRef } from "react";
import { ReactBarcode } from "react-jsbarcode";

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
        <div ref={printRef}>
          {printConfig.pdfBase64 && (
            <div className="flex justify-center">
              <embed
                src={`data:application/pdf;base64,${printConfig.pdfBase64}`}
                width="400"
                height="300"
                type="application/pdf"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagDialog;
