import db from "@/providers/database";

type props = {
  names: string[]
}

export const getFirstBlisterTypeInNames = ({ names }: props) => {
  return db.blisterType.findFirst({ where: { name: { in: names } } })
}