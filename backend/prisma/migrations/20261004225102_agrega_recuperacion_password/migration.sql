-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "recuperacionExpira" TIMESTAMP(3),
ADD COLUMN     "recuperacionHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_recuperacionHash_key" ON "Usuario"("recuperacionHash");

