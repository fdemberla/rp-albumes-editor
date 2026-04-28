-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "color_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "color_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "albums_color_tags_idx" ON "albums" USING GIN ("color_tags");

-- CreateIndex
CREATE INDEX "photos_color_tags_idx" ON "photos" USING GIN ("color_tags");
