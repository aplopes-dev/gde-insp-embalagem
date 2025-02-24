export type Op = {
  id: number
  code: string
  quantityToProduce: number
  productTypeId: number
  blisterTypeId: number
  boxTypeId: number
  boxes?: OpBox[]
}

export type OpBox = {
  id?: number
  code: string
  blisters?: OpBlister[]
}

export type OpBlister = {
  id?: number
  code: string
  quantity: number
}