import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, Dispatch, SetStateAction } from "react";

type PrintTagProps = {
  isOpen: boolean;
  printConfig: {
    pdfBase64: string | null;
    quantity: number;
  };
  // aceitar diretamente o setState do pai
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onPrintSuccess?: (barcode: string) => void;

  // props que o pai está enviando (opcional se você não usar ainda)
  itemName?: string;
  itemDescription?: string;
  batchCode?: string;
};

const PrintTagDialog = ({
  isOpen,
  onOpenChange,
  onPrintSuccess,
  printConfig,
  itemName,
  itemDescription,
  batchCode,
}: PrintTagProps) => {
  const printRef = useRef<HTMLDivElement>(null);


  // Alternativa: impressão no navegador (lado do cliente)
  const imprimirNoNavegador = () => {
    if (!printConfig.pdfBase64) return;
    const w = window.open("", "_blank");
    if (!w) return;
    // Gera um HTML mínimo com o embed do PDF e auto-chama window.print
    w.document.open();
    w.document.write(`<!DOCTYPE html><html><head><title>Etiqueta</title></head><body style="margin:0;">
      <embed src="data:application/pdf;base64,${printConfig.pdfBase64}" type="application/pdf" width="100%" height="100%" />
      <script>setTimeout(()=>{ window.focus(); window.print(); }, 500);</script>
    </body></html>`);
    w.document.close();
  };

  // Removido o envio para servidor (CUPS). Impressão apenas no navegador.

  // Retornar comportamento: ao abrir com PDF pronto, já acionar impressão no navegador
  useEffect(() => {
    if (isOpen && printConfig.pdfBase64) {
      imprimirNoNavegador();
    }
    // Fechar o diálogo após abrir o print (opcional):
    // onOpenChange(false);
  }, [isOpen, printConfig.pdfBase64]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Etiqueta {batchCode ? `• ${batchCode}` : ""}</DialogTitle>
          <DialogDescription>
            {itemName ? `${itemName} — ` : ""}
            {itemDescription ?? "Etiqueta para impressão"}
          </DialogDescription>
        </DialogHeader>
        <div ref={printRef} className="flex flex-col items-center gap-3">
          {printConfig.pdfBase64 ? (
            <>
              <embed
                src={`data:application/pdf;base64,${printConfig.pdfBase64}`}
                width="500"
                height="400"
                type="application/pdf"
                className="border rounded"
              />
              <div className="flex gap-2">
                <Button variant="default" onClick={imprimirNoNavegador}>
                  Imprimir etiqueta
                </Button>
              </div>
            </>
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