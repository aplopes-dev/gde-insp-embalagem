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
  opId
}: PrintTagProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<PrintTagJerpData>();

  const handlePrint = () => {
    const printContent = printRef.current!.innerHTML;
    const printWindow = window.open("", "", "height=600,width=800")!;
    printWindow.document.write("<html><head><title>Print</title>");
    printWindow.document.write(
      `<style>
        @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap');
        
        body{
          font-family: Arial, Helvetica, sans-serif;
          width: 5cm;
          height: 2.5cm;
        }

        .tag-area {
          padding: 3px;
          width: 5cm;
          height: 2.5cm;
          background-color: white;
          color: #000;
          font-size: 9px;
          gap: 5px;
          display: flex;
          flex-direction: column;
        }

        .title {
          text-transform: uppercase;
          font-weight: bold;
          font-size: 10px;
        }

        .description {
          font-size: 6px;
        }

        .batch {
          text-transform: uppercase;
          font-weight: bold;
          font-size: 10px;
        }

        .barcode-row {
          display: flex;
        }

        .barcode {
          font-family: "Libre Barcode 39", system-ui;
          font-size: 20px;
          flex: auto;
          text-align: center;
        }

        .quantity {
          width: 50%;
          text-transform: uppercase;
          font-size: 7.5px;
          font-weight: bold;
        }
        </style>`
    );
    printWindow.document.write("</head><body >");
    printWindow.document.write(printContent);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  const loadData = async () => {
    const tagData: PrintTagJerpData = await getBarcodeFromOpId(opId, quantity);
    setData(tagData);
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
        <Button
          type="button"
          variant={"outline"}
          onClick={handlePrint}
        >
          Imprimir
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagDialog;
