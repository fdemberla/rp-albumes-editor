/*
  Warnings:

  - The `gps_latitude` column on the `photos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `gps_longitude` column on the `photos` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "photos" DROP COLUMN "gps_latitude",
ADD COLUMN     "gps_latitude" DOUBLE PRECISION,
DROP COLUMN "gps_longitude",
ADD COLUMN     "gps_longitude" DOUBLE PRECISION;
