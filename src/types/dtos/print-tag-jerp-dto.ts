export type PrintTagJerpDto = {
  message: string;
  id: number;
  quantidadeApontada: number;
  idBarras: number;
  quantidadeLote?: number;      // QTDE LOTE
  relatorioPgqf?: string;       // RELATÓRIO PGQF Nº
  data?: string;                // DATA
  pepsAprovado?: boolean;       // PEPS | APROVADO
  logoUrl?: string;             // URL do logo
  qrCodeData?: string;          // Dados para o QR Code
};
