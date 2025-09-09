export interface OpJerpDto {
  id: number
  numero: number
  produto: ProductJerpDto
  quantidadeAProduzir: number
  embalagens: PackagingJerpDto[]
}

export type ProductJerpDto = {
  id: number
  nome: string
}

export type PackagingJerpDto = {
  id: number
  nome: string
  quantidadeAlocada: number
  slots?: number              // NOVO: Quantos produtos cabem no blister
  limitePorCaixa?: number     // NOVO: Quantos blisters cabem na caixa
}