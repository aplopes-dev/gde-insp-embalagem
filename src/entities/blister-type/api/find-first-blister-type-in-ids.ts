import db from "@/providers/database";

type props = {
  ids: number[]
}

export const findFirstBlisterTypeInIds = ({ ids }: props) => {
  return db.blisterType.findFirst({ where: { id: { in: ids } } })
}
