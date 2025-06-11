import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useRef } from "react";
import { ReactBarcode } from "react-jsbarcode";
import QRCode from "react-qr-code";

type PrintTagProps = {
  isOpen: boolean;
  itemName: string;
  itemDescription: string;
  batchCode: string;
  printConfig: {
    barcode: string;          // Código de barras
    quantity: number;          // QTDE EMBAL.
    batchQuantity?: number;     // QTDE LOTE
    reportNumber?: string;      // RELATÓRIO PGQF Nº
    date?: string;              // DATA
    pepsApproved?: boolean;     // PEPS | APROVADO
    logoUrl?: string;           // URL do logo
    qrCodeData?: string;        // Dados para o QR Code
  };
  onOpenChange: (open: boolean) => void;
  onPrintSuccess?: (barcode: string) => void;
};

const PrintTagDialog = ({
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
     // onOpenChange(false);
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
              {/* Cabeçalho com logo e título */}
              <div className="header-row">
                <div className="logo-area">
                  {printConfig.logoUrl ? (
                    <img src={printConfig.logoUrl} alt="Logo" className="company-logo" />
                  ) : (
                    <div></div>
                  )}
                </div>
                <div className="gde-name">GDE - Genesis Devices & Equipaments</div>
                <div className="pgqf">PGQF</div>
              </div>
              
              {/* Título do processo */}
              <div className="process-title">PROCESSO DA GARANTIA DA QUALIDADE FORNECEDORES</div>
              
              {/* Informações do produto */}
              <div className="info-section">
                <div className="info-row">
                  <span className="info-label">PEÇA:</span>
                  <span className="info-value">{itemName} ({itemDescription})</span>
                </div>
                
                <div className="info-row border-bottom">
                  <div className="info-col">
                    <span className="info-label">QTDE LOTE:</span>
                    <span className="info-value">{printConfig.batchQuantity || ""}</span>
                  </div>
                  
                  <div className="info-col">
                    <span className="info-label">QTDE EMBAL.:</span>
                    <span className="info-value">{printConfig.quantity}</span>
                  </div>
                </div>
                
                <div className="info-row border-bottom">
                  <span className="info-label">RELATÓRIO PGQF Nº:</span>
                  <span className="info-value">{printConfig.reportNumber || ""}</span>
                </div>
                
                <div className="info-row border-bottom">
                  <span className="info-label">DATA:</span>
                  <span className="info-value">{printConfig.date || ""}</span>
                </div>
                
                <div className="info-row border-bottom">
                  <span className="info-label">PEPS | APROVADO</span>
                  <span className="info-value">{printConfig.pepsApproved ? "SIM" : ""}</span>
                </div>
              </div>
              
              {/* Código do produto em destaque e QRCode */}
              <section className="product-qrcode-section">
                <div className="product-info">
                  <div className="title no-warp-line">{itemName}</div>
                  <div className="description no-warp-line">{itemDescription}</div>
                </div>
                
                {printConfig.qrCodeData && (
                  <div className="qrcode-container">
                    {/* @ts-expect-error: react-qr-code types may not match JSX.Element */}
                    <QRCode
                      value={printConfig.qrCodeData || ""}
                      size={40}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      level="L"
                    />
                  </div>
                )}
              </section>
              
              {/* Área do código de barras e informações de lote */}
              <div className="barcode-row">
                <div className="barcode-container">
                  <ReactBarcode
                    value={`${printConfig.barcode}`}
                    options={{ format: "CODE39", height: 40, width:1.0, displayValue: false }}                  
                  />
                </div>
                <div className="lot-quantity-info">
                  <div className="batch">LOTE: OP{batchCode} - {printConfig.barcode}</div>
                  <div className="quantity">QUANTIDADE: {printConfig.quantity}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintTagDialog;
