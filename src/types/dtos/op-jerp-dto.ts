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
}