/**
 * Cria/atualiza apenas os utilizadores bypass para testes (AUTH_DEV_BYPASS=true).
 * Uso: após `prisma migrate deploy`, executar `npm run seed:bypass`.
 */
import {
  DEV_BYPASS_PASSWORD_PLAINTEXT,
  DEV_BYPASS_USER_SEEDS,
} from "../src/libs/auth-dev-bypass";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hash = bcrypt.hashSync(DEV_BYPASS_PASSWORD_PLAINTEXT, 10);
  for (const u of DEV_BYPASS_USER_SEEDS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hash },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hash,
      },
    });
  }
  console.log(
    "Bypass users OK:",
    DEV_BYPASS_USER_SEEDS.map((x) => x.email).join(", ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
