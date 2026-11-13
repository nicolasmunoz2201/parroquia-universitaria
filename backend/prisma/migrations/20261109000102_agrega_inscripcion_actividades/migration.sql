-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('EN_ESPERA', 'PENDIENTE', 'ACEPTADA', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA', 'LIBERADA');

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "lugar" TEXT,
    "cupos" INTEGER NOT NULL,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "organismoId" TEXT NOT NULL,
    "creadorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" TEXT NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL,
    "motivoRechazo" TEXT,
    "asistio" BOOLEAN,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actividadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Actividad_inicio_idx" ON "Actividad"("inicio");

-- CreateIndex
CREATE INDEX "Inscripcion_actividadId_estado_idx" ON "Inscripcion"("actividadId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_actividadId_usuarioId_key" ON "Inscripcion"("actividadId", "usuarioId");

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_organismoId_fkey" FOREIGN KEY ("organismoId") REFERENCES "Organismo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
