-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('KILOGRAMO', 'LITRO', 'UNIDAD', 'PAQUETE');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "MotivoMovimiento" AS ENUM ('DONACION', 'COMPRA', 'CONSUMO', 'MERMA', 'VENCIMIENTO', 'CONTEO_FISICO');

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad" "UnidadMedida" NOT NULL,
    "stockMinimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donante" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidadInicial" DOUBLE PRECISION NOT NULL,
    "cantidadDisponible" DOUBLE PRECISION NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "donanteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "motivo" "MotivoMovimiento" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "observacion" TEXT,
    "insumoId" TEXT NOT NULL,
    "loteId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_nombre_key" ON "Insumo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Donante_nombre_key" ON "Donante"("nombre");

-- CreateIndex
CREATE INDEX "Lote_insumoId_fechaVencimiento_idx" ON "Lote"("insumoId", "fechaVencimiento");

-- CreateIndex
CREATE INDEX "MovimientoInventario_insumoId_createdAt_idx" ON "MovimientoInventario"("insumoId", "createdAt");

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_donanteId_fkey" FOREIGN KEY ("donanteId") REFERENCES "Donante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
