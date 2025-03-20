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
  id?: string
  code: string
  blisters?: OpBlister[]
}

export type OpBlister = {
  id?: string
  code: string
  quantity: number
}