export type PrintTagJerpDto = {
  message: string;
  id: number;
  quantidadeApontada: number;
  idBarras: number;
 
  quantidadePendente: number;
  descricao: string | null;
  pdfBase64: string | null;
};