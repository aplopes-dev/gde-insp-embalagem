import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import localFont from "next/font/local";
import { useEffect } from "react";

const myFont = localFont({ src: "./fonts/LibreBarcode39-Regular.ttf" });

type PrintTagProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const PrintTagDialog = ({ isOpen, onOpenChange }: PrintTagProps) => {
  useEffect(() => {
    if (isOpen) {
      //On open
    }
  }, [isOpen]);

  function printDiv() {
    var printContents = document.getElementById("tag-area")!.innerHTML;
    var originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiqueta</DialogTitle>
          <DialogDescription>Etiqueta para impressão</DialogDescription>
        </DialogHeader>
        <button onClick={() => printDiv()}>Print</button>
        <div className="tag-area" id="tag-area">
          <div className="title">DLR-23500AA-LD_00</div>
          <div className="description">
            DRL LED VW270-3 LAPA Lado Direito MCPCB
          </div>
          <div className="batch">Lote: (1122138) OP60967 - 1122138</div>
          <div className="barcode-row">
            <div className={myFont.className + " barcode"}>123</div>
            <div className="quantity">Quantidade: 11</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagDialog;
