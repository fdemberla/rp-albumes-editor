-- CreateTable
CREATE TABLE "albums" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "photographer" VARCHAR(255) NOT NULL,
    "event_date" DATE NOT NULL,
    "city" VARCHAR(255),
    "state" VARCHAR(255),
    "country" VARCHAR(255),
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "original_filename" VARCHAR(500) NOT NULL,
    "stored_filename" VARCHAR(500) NOT NULL,
    "stored_path" VARCHAR(1000) NOT NULL,
    "thumbnail_path" VARCHAR(1000),
    "file_size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "title" VARCHAR(500),
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "copyright" VARCHAR(500),
    "artist" VARCHAR(255),
    "date_created" VARCHAR(100),
    "city" VARCHAR(255),
    "state" VARCHAR(255),
    "country" VARCHAR(255),
    "gps_latitude" VARCHAR(50),
    "gps_longitude" VARCHAR(50),
    "camera_make" VARCHAR(255),
    "camera_model" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "albums_photographer_idx" ON "albums"("photographer");

-- CreateIndex
CREATE INDEX "albums_city_country_idx" ON "albums"("city", "country");

-- CreateIndex
CREATE INDEX "albums_event_date_idx" ON "albums"("event_date");

-- CreateIndex
CREATE INDEX "albums_keywords_idx" ON "albums" USING GIN ("keywords");

-- CreateIndex
CREATE INDEX "photos_album_id_idx" ON "photos"("album_id");

-- CreateIndex
CREATE INDEX "photos_keywords_idx" ON "photos" USING GIN ("keywords");

-- CreateIndex
CREATE INDEX "photos_artist_idx" ON "photos"("artist");

-- CreateIndex
CREATE INDEX "photos_city_country_idx" ON "photos"("city", "country");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
