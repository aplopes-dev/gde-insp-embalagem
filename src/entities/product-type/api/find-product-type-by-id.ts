import db from "@/providers/database";

type props = {
  id: number
}

export const findProductTypeById = ({ id }: props) => {
  return db.productType.findUnique({ where: { id } })
}