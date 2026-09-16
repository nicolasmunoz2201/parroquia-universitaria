/*
  Warnings:

  - You are about to drop the column `imagenUrl` on the `Publicacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Publicacion" DROP COLUMN "imagenUrl",
ADD COLUMN     "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[];
