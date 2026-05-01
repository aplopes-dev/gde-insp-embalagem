import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useCallback, useEffect, useRef } from "react";

type PrintTagProps = {
  isOpen: boolean;
  printConfig: {
    pdfBase64: string | null;
    quantity: number;
    /** Opcional: aparece no nome do trabalho CUPS / notificações do sistema (`Etiqueta …`). */
    barcode?: string | number | null;
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

  const enviarPdfParaImpressao = useCallback(
    async (pdfBase64: string) => {
      try {
        const bc = printConfig.barcode;
        const jobTitle =
          bc != null && String(bc).trim().length > 0
            ? `Etiqueta ${String(bc).trim()}`
            : undefined;

        const resposta = await fetch("/api/imprimir-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfBase64,
            ...(jobTitle ? { jobTitle } : {}),
          }),
        });

        const data = await resposta.json().catch(() => ({}));

        if (resposta.ok) {
          toast({
            title: "Impressão",
            description: "Pedido enviado ao servidor de impressão.",
          });
          onPrintSuccess?.(`${printConfig.quantity}`);
          onOpenChange(false);
        } else {
          const desc =
            (data as { detail?: string; message?: string }).detail ||
            (data as { message?: string }).message ||
            `HTTP ${resposta.status}`;
          console.error("Erro ao enviar PDF para impressão:", desc);
          toast({
            title: "Impressão falhou",
            description: desc.slice(0, 400),
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Erro ao enviar PDF para impressão", e);
        toast({
          title: "Impressão falhou",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      }
    },
    [onOpenChange, onPrintSuccess, printConfig.barcode, printConfig.quantity]
  );

  useEffect(() => {
    if (!isOpen || !printConfig.pdfBase64) return;
    const t = window.setTimeout(() => {
      void enviarPdfParaImpressao(printConfig.pdfBase64!);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isOpen, printConfig.pdfBase64, enviarPdfParaImpressao]);

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
