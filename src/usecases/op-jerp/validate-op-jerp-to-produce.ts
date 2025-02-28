import { OpJerpDto } from "@/types/dtos/op-jerp-dto";

export function validateOpJerpToProduce(op: OpJerpDto) {
  if (!op) throw new Error("OP está vazia")

  const { embalagens, produto, id, numero, quantidadeAProduzir } = op

  if (!id) throw new Error("O ID da OP é obrigatório")
  if (!numero) throw new Error("O numero da OP é obrigatório")
  if (!produto?.id) throw new Error("O ID do produto é obrigatório")
  if (!quantidadeAProduzir || quantidadeAProduzir <= 0) throw new Error("Quantidade a produzir deve ser maior que zero")
  if (!embalagens || embalagens.length == 0) throw new Error("Embalagens são obrigatórias")
  if (embalagens.length < 2) throw new Error("Deve haver ao menos 2 embalagens (blister e caixa)")

  embalagens.forEach(embalagem => {
    if (!embalagem.id) throw new Error("O ID da embalagem é obrigatório.")
    if (!embalagem.quantidadeAlocada || embalagem.quantidadeAlocada < 1) throw new Error("Deve haver ao menos 1 unidade alocada")
  })
}