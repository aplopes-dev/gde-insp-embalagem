-- Make User.password column nullable to avoid storing local passwords (IATF compliance)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

