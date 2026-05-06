import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useCallback, useEffect } from "react";

type PrintTagProps = {
  isOpen: boolean;
  printConfig: {
    pdfBase64: string | null;
    quantity: number;
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
  const imprimirNoBrowser = useCallback(
    (pdfBase64: string) => {
      const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.cssText =
        "position:fixed;top:0;left:0;width:0;height:0;border:0;";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.print();
      };

      const afterPrint = () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
        window.removeEventListener("afterprint", afterPrint);
      };
      window.addEventListener("afterprint", afterPrint);

      toast({ title: "Impressão", description: "Diálogo de impressão aberto." });
      onPrintSuccess?.(`${printConfig.quantity}`);
      onOpenChange(false);
    },
    [onOpenChange, onPrintSuccess, printConfig.quantity]
  );

  useEffect(() => {
    if (!isOpen || !printConfig.pdfBase64) return;
    const t = window.setTimeout(() => {
      imprimirNoBrowser(printConfig.pdfBase64!);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [isOpen, printConfig.pdfBase64, imprimirNoBrowser]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Etiqueta</DialogTitle>
          <DialogDescription>Etiqueta para impressão</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
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
