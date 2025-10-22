import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
const prisma = new PrismaClient()
async function main() {

  const boxTypesSeed$ = prisma.boxType.createMany({
    data: [
      {
        id: 3457,
        name: "CAIXA 520X320X170 TRIPLEX",
        code: "CAIXA 520X320X170 TRIPLEX",
        description: "CAIXA DE PAPELÃO 520X320X170 TRIPLEX",
      },
    ]
  })

  const blisterTypesSeed$ = prisma.blisterType.createMany({
    data: [
      {
        id: 38810,
        name: "BLISTER_XBB",
        code: "Blister B515 Antiestático",
        description: "Blister B515 em Poliestireno de Alto Impacto (HIPS) Preto Antiestático 0.5mm - 56 Cavidades",
        slots: 56,
        limitPerBox: 6,
        boxTypeId: 1
      },
      {
        id: 44203,
        name: "BLISTER-A25-090",
        code: "BLISTER-TL-A25-090",
        description: "BLISTER-TL-A25-090 em Poliestireno de Alto Impacto (HIPS) Preto Antiestático",
        slots: 6,
        limitPerBox: 9,
        boxTypeId: 1
      },
      {
        id: 42333,
        name: "BLISTER-BL-03832070LD",
        code: "BLISTER-TL-23411AA/23412AA",
        description: "BLISTER-TL-23411AA/23412AA em Poliestireno de Alto Impacto (HIPS) Preto Antiestático 0.5mm",
        slots: 10,
        limitPerBox: 4,
        boxTypeId: 1
      },
      {
        id: 45206,
        name: "BLISTER-BL-03832070LD",
        code: "BLISTER-BL-03832070LD_01-ESD",
        description: "Blister BL-03832070LD_01 em Poliestireno de Alto Impacto (HIPS) Preto Antiestático 0.5mm - 4 Cavidades",
        slots: 4,
        limitPerBox: 3,
        boxTypeId: 1
      },
      {
        id: 45207,
        name: "BLISTER-BL-03833070LE",
        code: "BLISTER-BL-03833070LE_01-ESD",
        description: "Blister BL-03833070LE_01 em Poliestireno de Alto Impacto (HIPS) Preto Antiestático 0.5mm - 4 Cavidades",
        slots: 10,
        limitPerBox: 4,
        boxTypeId: 1
      },
      {
        id: 45174,
        name: "BLISTER_TL-23489AA-LE/TL23490AA-LD",
        code: "BLISTER-TL-23489-23490",
        description: "BLISTER-TL-23489-23490 em Poliestireno de Alto Impacto (HIPS) Preto Antiestático - 0,5mm",
        slots: 3,
        limitPerBox: 9,
        boxTypeId: 1
      },
    ]
  })

  const productTypesSeed$ = prisma.productType.createMany({
    data: [
      {
        id: 42262,
        name: "XBB",
        code: "SR-23495AA-LE_01",
        description: "SIDE REPEATER 23495AA - LADO ESQUERDO SR-XBB"
      },
      {
        id: 42263,
        name: "XBB",
        code: "SR-23496AA-LD_01",
        description: "SIDE REPEATER 23496AA - LADO DIREITO SR-XBB"
      },
      {
        id: 41673,
        name: "A25-090",
        code: "TL-A25-090_00",
        description: "PCI DRIVER + LED - LANTERNA TL"
      },
      {
        id: 41219,
        name: "LE-TL23411AA",
        code: "TL-23411AA-LE-REV00",
        description: "Conjunto LDM+LED T2 Applique G1NC SPIN Lado Esquerdo"
      },
      {
        id: 42115,
        code: "TL-23489-LE_00",
        name: "TL-23489AA-LE",
        description: "Tail Lamp VW270-3 LAPA T2 Lado Esquerdo"
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

  const adminEmail = "danillomota99@gmail.com";
  const userSeed$ = prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Danillo",
      email: adminEmail,
      role: "SUPERVISOR",
      password: bcrypt.hashSync("Abc123!", 10)
    }
  })

  await prisma.$transaction([
    boxTypesSeed$,
    blisterTypesSeed$,
    productTypesSeed$,
    managerSeed$,
    userSeed$
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