import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {

  const boxTypesSeed$ = prisma.boxType.createMany({
    data: [
      {
        id: 2,
        name: "CAIXA 450 x 270 x 400 TRIPLEX",
        description: "Descrição da caixa 02",
      },
      {
        id: 3,
        name: "CAIXA 520X320X170 TRIPLEX",
        description: "Descrição da caixa 03",
      },

    ]
  })

  const blisterTypesSeed$ = prisma.blisterType.createMany({
    data: [
      {
        id: 1,
        name: "BL-05432070 LD Rev.0 Antiestático",
        description: "Descrição blister 02",
        slots: 50,
        limitPerBox: 2,
        boxTypeId: 3
      },
      {
        id: 4,
        name: "Blister BL-03832070LD Rev.0 Antiestático",
        description: "Descrição blister 01",
        slots: 10,
        limitPerBox: 5,
        boxTypeId: 2
      },
    ]
  })

  const productTypesSeed$ = prisma.productType.createMany({
    data: [
      {
        id: 1,
        code: "P01",
        name: "BL-03832070 LD - NEW",
        description: "Descrição do produto 01"
      },
      {
        id: 3,
        code: "P03",
        name: "BL-05432070 LD",
        description: "Descrição do item BL-05432070 LD"
      },
    ]
  })

  const managerSeed$ = prisma.manager.create({
    data: {
      id: 1,
      firstName: "Gestor",
      lastName: "Teste",
      password: "$2b$10$AeAbsspMKL1YM6Uo25aYS.sE5jpa6Rte3U.ZSFYYPn4iRDNmnz0Fm",
      email: "gestor.teste@gde.com"
    }
  })

  await prisma.$transaction([
    boxTypesSeed$,
    blisterTypesSeed$,
    productTypesSeed$,
    managerSeed$
  ])

}
main()
  .then(async () => {
    console.log("SEED SUCCESS");
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("SEED ERROR");
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })