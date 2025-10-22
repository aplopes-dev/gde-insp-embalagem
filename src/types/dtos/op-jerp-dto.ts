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
  slots?: number              // Quantos produtos cabem no blister (apenas para BLISTER)
  limitePorCaixa?: number     // Quantos blisters cabem na caixa (apenas para BLISTER)
}