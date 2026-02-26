-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- DropIndex
DROP INDEX "albums_photographer_idx";

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "photographer_id" UUID,
ALTER COLUMN "photographer" DROP NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotografos" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320),
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fotografos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fotografos_email_key" ON "fotografos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fotografos_user_id_key" ON "fotografos"("user_id");

-- CreateIndex
CREATE INDEX "fotografos_email_idx" ON "fotografos"("email");

-- CreateIndex
CREATE INDEX "albums_photographer_id_idx" ON "albums"("photographer_id");

-- AddForeignKey
ALTER TABLE "fotografos" ADD CONSTRAINT "fotografos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_photographer_id_fkey" FOREIGN KEY ("photographer_id") REFERENCES "fotografos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
