import db from "@/providers/database";

type props = {
  ids: number[]
}

export const findFirstBoxTypeInIds = ({ ids }: props) => {
  return db.boxType.findFirst({ where: { id: { in: ids } } })
}