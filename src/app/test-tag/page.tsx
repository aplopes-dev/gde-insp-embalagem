"use client";

import { Button } from "@/components/ui/button";
import PrintTagDialog from "@/features/print-tag-dialog/ui";
import { useState } from "react";

export default function TestTagPage() {
  const [openPrintTagDialog, setOpenPrintTagDialog] = useState<boolean>(false);
  
  const mockTagData = {
    quantidadeApontada: 50,
    idBarras: "123456789",
    relatorioPgqf: "REL-2023-001",
    data: "01/01/2023",
    pepsAprovado: true,
    logoUrl: "/images/logo.png",
    qrCodeData: "https://gde.com.br/op/123456"
  };

  const handlePrintSuccess = (barcode: string) => {
    console.log("Impressão concluída com sucesso para o código:", barcode);
    alert("Impressão concluída com sucesso!");
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Teste de Impressão de Etiqueta</h1>
      
      <Button 
        onClick={() => setOpenPrintTagDialog(true)}
        className="mb-4"
      >
        Abrir Diálogo de Impressão
      </Button>
      
      <div className="bg-gray-100 p-4 rounded-md">
        <h2 className="font-bold mb-2">Dados de teste:</h2>
        <pre className="text-sm">{JSON.stringify(mockTagData, null, 2)}</pre>
      </div>

      <PrintTagDialog
        onPrintSuccess={handlePrintSuccess}
        itemName="PRODUTO-TESTE"
        itemDescription="Produto para teste de impressão"
        printConfig={{
          barcode: mockTagData.idBarras,
          quantity: mockTagData.quantidadeApontada,
          batchQuantity: 100,
          reportNumber: mockTagData.relatorioPgqf,
          date: mockTagData.data,
          pepsApproved: mockTagData.pepsAprovado,
          logoUrl: mockTagData.logoUrl,
          qrCodeData: mockTagData.qrCodeData,
        }}
        batchCode="OP-TESTE-001"
        isOpen={openPrintTagDialog}
        onOpenChange={setOpenPrintTagDialog}
      />
    </div>
  );
}