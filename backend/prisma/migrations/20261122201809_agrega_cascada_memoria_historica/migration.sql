-- DropForeignKey
ALTER TABLE "FotoHito" DROP CONSTRAINT "FotoHito_hitoId_fkey";

-- DropForeignKey
ALTER TABLE "Testimonio" DROP CONSTRAINT "Testimonio_hitoId_fkey";

-- CreateIndex
CREATE INDEX "HitoHistorico_fecha_idx" ON "HitoHistorico"("fecha");

-- AddForeignKey
ALTER TABLE "FotoHito" ADD CONSTRAINT "FotoHito_hitoId_fkey" FOREIGN KEY ("hitoId") REFERENCES "HitoHistorico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonio" ADD CONSTRAINT "Testimonio_hitoId_fkey" FOREIGN KEY ("hitoId") REFERENCES "HitoHistorico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
