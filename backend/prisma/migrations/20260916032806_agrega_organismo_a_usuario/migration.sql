-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "organismoId" TEXT;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_organismoId_fkey" FOREIGN KEY ("organismoId") REFERENCES "Organismo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
