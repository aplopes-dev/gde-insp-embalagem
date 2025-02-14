import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {

  const boxTypesSeed$ = prisma.boxType.createMany({
    data: [
      {
        id: 1,
        name: "CAIXA 520X320X170 TRIPLEX",
        description: "Descrição da caixa 01",
      },
    ]
  })

  const blisterTypesSeed$ = prisma.blisterType.createMany({
    data: [
      {
        id: 1,
        name: "BLISTER_XBB",
        description: "Descrição blister blister_xbb",
        slots: 56,
        limitPerBox: 6,
        boxTypeId: 1
      },
      {
        id: 2,
        name: "BLISTER-A25-090",
        description: "Descrição blister A25-090",
        slots: 6,
        limitPerBox: 9,
        boxTypeId: 1
      },
      {
        id: 3,
        name: "BLISTER-LE-TL23411AA",
        description: "Descrição blister le-tl23411aa",
        slots: 10,
        limitPerBox: 4,
        boxTypeId: 1
      },
      {
        id: 4,
        name: "BLISTER-BL-03833070LE",
        description: "Descrição blister BL-03833070LE",
        slots: 10,
        limitPerBox: 4,
        boxTypeId: 1
      },
      {
        id: 5,
        name: "BLISTER-BL-03832070LD",
        description: "Descrição blister BL-03832070LD",
        slots: 4,
        limitPerBox: 3,
        boxTypeId: 1
      },
      {
        id: 6,
        name: "BLISTER_TL-23489AA-LE/TL23490AA-LD",
        description: "Descrição blister TL-23489AA-LE/TL-23490AA-LD",
        slots: 3,
        limitPerBox: 3,
        boxTypeId: 1
      },
    ]
  })

  const productTypesSeed$ = prisma.productType.createMany({
    data: [
      {
        id: 1,
        code: "XBB",
        name: "XBB",
        description: "Descrição xbb"
      },
      {
        id: 2,
        code: "A25-090",
        name: "A25-090",
        description: "Descrição A25-090"
      },
      {
        id: 3,
        code: "LE-TL23411AA",
        name: "LE-TL23411AA",
        description: "Descrição LE-TL23411AA"
      },
      {
        id: 4,
        code: "BL-03833070LE",
        name: "BL-03833070LE",
        description: "Descrição BL-03833070LE"
      },
      {
        id: 5,
        code: "BL-03832070LD",
        name: "BL-03832070LD",
        description: "Descrição BL-03832070LD"
      },
      {
        id: 6,
        code: "TL-23489AA-LE",
        name: "TL-23489AA-LE",
        description: "Descrição TL-23489AA-LE"
      },
      {
        id: 7,
        code: "TL-23490AA-LD",
        name: "TL-23490AA-LD",
        description: "Descrição TL-23490AA-LD"
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