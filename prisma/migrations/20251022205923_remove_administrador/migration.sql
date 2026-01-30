-- Atualizar todos os usuários com role ADMINISTRADOR para SUPERVISOR
UPDATE "User" SET role = 'SUPERVISOR' WHERE role::text = 'ADMINISTRADOR';

-- Remover o valor ADMINISTRADOR do enum UserRole
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('SUPERVISOR', 'OPERADOR');

ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN role TYPE "UserRole" USING role::text::"UserRole";

ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'SUPERVISOR';

DROP TYPE "UserRole_old";
