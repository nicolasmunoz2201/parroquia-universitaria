-- CreateEnum
CREATE TYPE "TipoSacramento" AS ENUM ('BAUTISMO', 'PRIMERA_COMUNION', 'CONFIRMACION', 'MATRIMONIO', 'UNCION_ENFERMOS');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'OBSERVADA', 'APROBADA', 'RECHAZADA', 'CANCELADA', 'REALIZADA');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'SECRETARIA';

-- CreateTable
CREATE TABLE "HorarioSacramento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoSacramento" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "cupos" INTEGER NOT NULL DEFAULT 1,
    "lugar" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioSacramento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudSacramento" (
    "id" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "nombreBeneficiario" TEXT NOT NULL,
    "comentario" TEXT,
    "observacion" TEXT,
    "solicitanteId" TEXT NOT NULL,
    "horarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudSacramento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoSolicitud" (
    "id" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoSolicitud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioSacramento_tipo_inicio_idx" ON "HorarioSacramento"("tipo", "inicio");

-- CreateIndex
CREATE INDEX "SolicitudSacramento_estado_idx" ON "SolicitudSacramento"("estado");

-- AddForeignKey
ALTER TABLE "SolicitudSacramento" ADD CONSTRAINT "SolicitudSacramento_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudSacramento" ADD CONSTRAINT "SolicitudSacramento_horarioId_fkey" FOREIGN KEY ("horarioId") REFERENCES "HorarioSacramento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoSolicitud" ADD CONSTRAINT "DocumentoSolicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudSacramento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

