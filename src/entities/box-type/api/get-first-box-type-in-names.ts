import db from "@/providers/database";

type props = {
  names: string[]
}

export const getFirstBoxTypeInNames = ({ names }: props) => {
  return db.boxType.findFirst({ where: { name: { in: names } } })
}