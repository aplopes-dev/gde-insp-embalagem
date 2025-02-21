import db from "@/providers/database";

type props = {
  name: string
}

export const getProductTypeFromName = ({ name }: props) => {
  return db.productType.findFirst({ where: { name } })
}