export type OpConfig = {
  id: number
  code: string
  productTypeId: number
  blisterTypeId: number
  boxTypeId: number
  quantityToProduce: number
  blisterSlots: number
  blisterPerBox: number
  boxGap: number
}

export type OpBoxesConfig = {
  quantityToProduce: number
  blisterSlots: number
  blisterPerBox: number
  boxGap: number
}

export type OpBlisterConfig = {
  quantityToProduce: number
  blisterPerBox: number
  blisterSlots: number
  boxIndex: number
  boxesToProduce: number
}
