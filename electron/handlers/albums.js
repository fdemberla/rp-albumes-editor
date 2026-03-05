const { ipcMain, dialog, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const archiver = require("archiver");
const storage = require("../services/storage");
const compression = require("../services/compression");

let prisma = null;

/**
 * Get or create the Prisma client singleton.
 */
function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

/**
 * Sanitize a filename: remove path separators, null bytes, and ".." sequences.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
  if (!name || typeof name !== "string") return "unnamed.jpg";
  return (
    name
      .replace(/[/\\]/g, "_")
      .replace(/\.\./g, "_")
      .replace(/\0/g, "")
      .trim() || "unnamed.jpg"
  );
}

/**
 * Generate a storage-safe filename with a unique suffix.
 * @param {string} originalName
 * @param {number} index
 * @returns {string}
 */
function makeStoredFilename(originalName, index, preserveExtension = false) {
  const safe = sanitizeFilename(originalName);
  const ext = path.extname(safe) || ".jpg";
  const base = path.basename(safe, ext);
  const padded = String(index).padStart(4, "0");
  const finalExt = preserveExtension ? ext : ".jpg";
  return `${base}_${padded}${finalExt}`.toLowerCase().replace(/\s+/g, "_");
}

/**
 * Register all album-related IPC handlers.
 * @param {Electron.IpcMain} _ipcMain - unused, we import ipcMain directly
 */
function registerAlbumHandlers() {
  // ─── Test Database Connection ────────────────────────────────────────────
  ipcMain.handle("db:testConnection", async () => {
    try {
      const db = getPrisma();
      await db.$queryRaw`SELECT 1`;
      return { success: true, message: "Connected to PostgreSQL" };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  // ─── Test SFTP Connection ────────────────────────────────────────────────
  ipcMain.handle("sftp:testConnection", async () => {
    return await storage.testConnection();
  });

  // ─── Create Album ───────────────────────────────────────────────────────
  ipcMain.handle("album:create", async (_event, input) => {
    try {
      const db = getPrisma();
      const data = {
        name: input.name,
        description: input.description || null,
        eventDate: new Date(input.eventDate),
        city: input.city || null,
        state: input.state || null,
        country: input.country || null,
        keywords: input.keywords || [],
      };
      // Support both new FK and legacy text field
      if (input.photographerId) data.photographerId = input.photographerId;
      if (input.photographer) data.photographer = input.photographer;

      const album = await db.album.create({
        data,
        include: { fotografo: true },
      });
      return { success: true, album };
    } catch (err) {
      console.error("[Album] Error creating album:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── List Albums (with filters and pagination) ──────────────────────────
  ipcMain.handle("album:list", async (_event, filters) => {
    try {
      const db = getPrisma();
      const where = {};

      if (filters) {
        if (filters.name) {
          where.name = { contains: filters.name, mode: "insensitive" };
        }
        if (filters.photographerId) {
          where.photographerId = filters.photographerId;
        }
        if (filters.photographer) {
          where.OR = [
            ...(where.OR || []),
            {
              photographer: {
                contains: filters.photographer,
                mode: "insensitive",
              },
            },
            {
              fotografo: {
                firstName: {
                  contains: filters.photographer,
                  mode: "insensitive",
                },
              },
            },
            {
              fotografo: {
                lastName: {
                  contains: filters.photographer,
                  mode: "insensitive",
                },
              },
            },
          ];
        }
        if (filters.city) {
          where.city = { contains: filters.city, mode: "insensitive" };
        }
        if (filters.country) {
          where.country = { contains: filters.country, mode: "insensitive" };
        }
        if (filters.state) {
          where.state = { contains: filters.state, mode: "insensitive" };
        }
        if (filters.dateFrom || filters.dateTo) {
          where.eventDate = {};
          if (filters.dateFrom)
            where.eventDate.gte = new Date(filters.dateFrom);
          if (filters.dateTo) where.eventDate.lte = new Date(filters.dateTo);
        }
        if (filters.keywords && filters.keywords.length > 0) {
          where.keywords = { hasSome: filters.keywords };
        }
      }

      const page = (filters && filters.page) || 1;
      const pageSize = (filters && filters.pageSize) || 20;

      // Dynamic sort — validate against allowlist
      const allowedSortFields = ["eventDate", "name", "createdAt"];
      const sortBy =
        filters && allowedSortFields.includes(filters.sortBy)
          ? filters.sortBy
          : "eventDate";
      const sortOrder =
        filters && ["asc", "desc"].includes(filters.sortOrder)
          ? filters.sortOrder
          : "desc";

      const [albums, total] = await Promise.all([
        db.album.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            fotografo: true,
            _count: { select: { photos: true } },
            photos: {
              select: { thumbnailPath: true },
              take: 6,
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        db.album.count({ where }),
      ]);

      // Map to include photoCount and preview thumbnail paths
      const mapped = albums.map((a) => ({
        ...a,
        photoCount: a._count.photos,
        previewThumbnails: a.photos.map((p) => p.thumbnailPath).filter(Boolean),
        photos: undefined,
        _count: undefined,
      }));

      return {
        success: true,
        albums: mapped,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (err) {
      console.error("[Album] Error listing albums:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Get Album by ID (with photos) ─────────────────────────────────────
  ipcMain.handle("album:get", async (_event, albumId) => {
    try {
      const db = getPrisma();
      const album = await db.album.findUnique({
        where: { id: albumId },
        include: {
          fotografo: true,
          photos: {
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { photos: true } },
        },
      });

      if (!album) {
        return { success: false, error: "Album not found" };
      }

      return {
        success: true,
        album: {
          ...album,
          photoCount: album._count.photos,
          _count: undefined,
        },
      };
    } catch (err) {
      console.error("[Album] Error getting album:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Update Album ──────────────────────────────────────────────────────
  ipcMain.handle("album:update", async (_event, albumId, input) => {
    try {
      const db = getPrisma();
      const data = {};

      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.photographerId !== undefined)
        data.photographerId = input.photographerId || null;
      if (input.photographer !== undefined)
        data.photographer = input.photographer;
      if (input.eventDate !== undefined)
        data.eventDate = new Date(input.eventDate);
      if (input.city !== undefined) data.city = input.city;
      if (input.state !== undefined) data.state = input.state;
      if (input.country !== undefined) data.country = input.country;
      if (input.keywords !== undefined) data.keywords = input.keywords;

      const album = await db.album.update({
        where: { id: albumId },
        data,
        include: { fotografo: true },
      });

      return { success: true, album };
    } catch (err) {
      console.error("[Album] Error updating album:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Delete Album ──────────────────────────────────────────────────────
  ipcMain.handle("album:delete", async (_event, albumId) => {
    try {
      const db = getPrisma();

      // Get album to know the date for SFTP directory
      const album = await db.album.findUnique({
        where: { id: albumId },
      });

      if (!album) {
        return { success: false, error: "Album not found" };
      }

      // Delete SFTP directory (photos + thumbnails)
      try {
        await storage.deleteAlbumDir(albumId, album.eventDate);
      } catch (sftpErr) {
        console.error(
          "[Album] SFTP cleanup error (non-fatal):",
          sftpErr.message,
        );
      }

      // Delete from DB (cascade deletes photos)
      await db.album.delete({ where: { id: albumId } });

      return { success: true };
    } catch (err) {
      console.error("[Album] Error deleting album:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Upload Photos to Album ─────────────────────────────────────────────
  ipcMain.handle("album:uploadPhotos", async (event, albumId, photos) => {
    try {
      const db = getPrisma();

      // Verify album exists and include fotografo for artist derivation
      const album = await db.album.findUnique({
        where: { id: albumId },
        include: { fotografo: true },
      });
      if (!album) {
        return { success: false, error: "Album not found" };
      }

      const results = [];
      const total = photos.length;

      for (let i = 0; i < total; i++) {
        const photo = photos[i];
        const isVideo = compression.isVideoFile(photo.filePath);
        const isRaw = compression.isRawFile(photo.filePath);

        // Send progress to renderer
        event.sender.send("album:uploadProgress", {
          current: i + 1,
          total,
          fileName: path.basename(photo.filePath),
          stage: (isVideo || isRaw) ? "uploading" : "compressing",
        });

        try {
          let fileBuffer, fileSize, fileWidth, fileHeight, thumbnail, storedFilename;

          if (isVideo) {
            // ── Video: read raw file (already compressed), generate thumbnail ──
            fileBuffer = await fs.promises.readFile(photo.filePath);
            fileSize = fileBuffer.length;
            fileWidth = null;
            fileHeight = null;

            // Generate thumbnail from video frame
            thumbnail = await compression.generateVideoThumbnail(photo.filePath);

            // Preserve .mp4 extension for videos
            storedFilename = makeStoredFilename(
              path.basename(photo.filePath),
              i + 1,
              true, // preserveExtension
            );
          } else if (isRaw) {
            // ── RAW photo: upload as-is (no compression), generate thumbnail ──
            fileBuffer = await fs.promises.readFile(photo.filePath);
            fileSize = fileBuffer.length;

            // Get dimensions from RAW via sharp metadata
            try {
              const rawMeta = await require("sharp")(photo.filePath).metadata();
              fileWidth = rawMeta.width || null;
              fileHeight = rawMeta.height || null;
            } catch {
              fileWidth = null;
              fileHeight = null;
            }

            // Generate thumbnail (sharp can read most RAW formats via libvips)
            thumbnail = await compression.generateThumbnail(photo.filePath);

            // Preserve original RAW extension
            storedFilename = makeStoredFilename(
              path.basename(photo.filePath),
              i + 1,
              true, // preserveExtension
            );
          } else {
            // ── JPEG/PNG photo: compress and generate thumbnail ──
            const compressed = await compression.compressPhoto(photo.filePath);
            fileBuffer = compressed.buffer;
            fileSize = compressed.size;
            fileWidth = compressed.width;
            fileHeight = compressed.height;

            thumbnail = await compression.generateThumbnail(photo.filePath);

            // Force .jpg extension since we're converting to JPEG
            storedFilename = makeStoredFilename(
              path.basename(photo.filePath),
              i + 1,
            ).replace(/\.[^.]+$/, ".jpg");
          }

          // Upload file to SFTP
          event.sender.send("album:uploadProgress", {
            current: i + 1,
            total,
            fileName: path.basename(photo.filePath),
            stage: "uploading",
          });

          const storedPath = await storage.uploadPhoto(
            albumId,
            storedFilename,
            fileBuffer,
            album.eventDate,
          );

          // Upload thumbnail to SFTP (thumbnails are always .jpg)
          const thumbFilename = storedFilename.replace(/\.[^.]+$/, ".jpg");
          const thumbnailPath = await storage.uploadThumbnail(
            albumId,
            thumbFilename,
            thumbnail.buffer,
            album.eventDate,
          );

          // Save record in PostgreSQL
          //    Inherit metadata from album (album fields always override)
          const metadata = photo.metadata || {};
          const photoCity =
            (metadata.location && metadata.location.city) || null;
          const photoState =
            (metadata.location && metadata.location.state) || null;
          const photoCountry =
            (metadata.location && metadata.location.country) || null;

          // Merge keywords: album keywords + photo keywords, deduplicated
          const photoKeywords = metadata.keywords || [];
          const albumKeywords = album.keywords || [];
          const mergedKeywords = [
            ...new Set([...albumKeywords, ...photoKeywords]),
          ];

          // Format album event date as string for dateCreated
          const albumDateStr = album.eventDate
            ? album.eventDate.toISOString().split("T")[0]
            : null;

          const dbPhoto = await db.photo.create({
            data: {
              albumId: albumId,
              originalFilename: path.basename(photo.filePath),
              storedFilename: storedFilename,
              storedPath: storedPath,
              thumbnailPath: thumbnailPath,
              mediaType: isVideo ? "video" : "photo",
              fileSize: fileSize,
              width: fileWidth,
              height: fileHeight,
              title: metadata.title || null,
              description: metadata.description || null,
              keywords: mergedKeywords,
              copyright: metadata.copyright || null,
              artist:
                (album.fotografo
                  ? `${album.fotografo.firstName} ${album.fotografo.lastName}`.trim()
                  : null) ||
                album.photographer ||
                metadata.artist ||
                null,
              dateCreated: albumDateStr || metadata.dateCreated || null,
              city: album.city || photoCity,
              state: album.state || photoState,
              country: album.country || photoCountry,
              gpsLatitude:
                metadata.location && metadata.location.gpsLatitude != null
                  ? parseFloat(metadata.location.gpsLatitude)
                  : null,
              gpsLongitude:
                metadata.location && metadata.location.gpsLongitude != null
                  ? parseFloat(metadata.location.gpsLongitude)
                  : null,
              cameraMake: (metadata.camera && metadata.camera.make) || null,
              cameraModel: (metadata.camera && metadata.camera.model) || null,
            },
          });

          results.push({
            success: true,
            originalFile: photo.filePath,
            photoId: dbPhoto.id,
            storedPath,
            compressedSize: fileSize,
          });
        } catch (photoErr) {
          console.error(
            `[Album] Error processing ${isVideo ? "video" : "photo"} ${i + 1}:`,
            photoErr.message,
          );
          results.push({
            success: false,
            originalFile: photo.filePath,
            error: photoErr.message,
          });
        }
      }

      // Final progress
      event.sender.send("album:uploadProgress", {
        current: total,
        total,
        fileName: "",
        stage: "complete",
      });

      const successCount = results.filter((r) => r.success).length;
      return {
        success: true,
        results,
        summary: {
          total,
          uploaded: successCount,
          failed: total - successCount,
        },
      };
    } catch (err) {
      console.error("[Album] Error in uploadPhotos:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Remove Photos from Album ──────────────────────────────────────────
  ipcMain.handle("album:removePhotos", async (_event, albumId, photoIds) => {
    try {
      const db = getPrisma();

      // Get photos to delete from SFTP
      const photos = await db.photo.findMany({
        where: {
          id: { in: photoIds },
          albumId: albumId,
        },
      });

      // Delete from SFTP
      for (const photo of photos) {
        try {
          if (photo.storedPath) await storage.deleteFile(photo.storedPath);
          if (photo.thumbnailPath)
            await storage.deleteFile(photo.thumbnailPath);
        } catch (sftpErr) {
          console.error(
            `[Album] SFTP delete error for ${photo.storedFilename}:`,
            sftpErr.message,
          );
        }
      }

      // Delete from DB
      await db.photo.deleteMany({
        where: {
          id: { in: photoIds },
          albumId: albumId,
        },
      });

      return { success: true, deletedCount: photos.length };
    } catch (err) {
      console.error("[Album] Error removing photos:", err);
      return { success: false, error: err.message };
    }
  });

  // ─── Get Photo (full version as base64) ─────────────────────────────────
  ipcMain.handle("album:getPhoto", async (_event, storedPath) => {
    try {
      const buffer = await storage.downloadFile(storedPath);
      const ext = path.extname(storedPath).toLowerCase();
      const isVideo = ext === ".mp4";
      const rawExts = [".cr2", ".cr3", ".nef", ".arw", ".orf", ".rw2", ".dng", ".raf", ".pef"];
      const isRaw = rawExts.includes(ext);

      if (isVideo) {
        const base64 = buffer.toString("base64");
        return {
          success: true,
          data: `data:video/mp4;base64,${base64}`,
          mediaType: "video",
        };
      }

      if (isRaw) {
        // Convert RAW to JPEG for browser display via sharp
        const sharp = require("sharp");
        const jpegBuffer = await sharp(buffer)
          .rotate()
          .jpeg({ quality: 92 })
          .toBuffer();
        const base64 = jpegBuffer.toString("base64");
        return {
          success: true,
          data: `data:image/jpeg;base64,${base64}`,
          mediaType: "photo",
        };
      }

      // JPEG / PNG
      let mimeType = "image/jpeg";
      if (ext === ".png") mimeType = "image/png";
      const base64 = buffer.toString("base64");
      return {
        success: true,
        data: `data:${mimeType};base64,${base64}`,
        mediaType: "photo",
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── Get Thumbnail (as base64) ─────────────────────────────────────────
  ipcMain.handle("album:getThumbnail", async (_event, thumbnailPath) => {
    try {
      const buffer = await storage.downloadFile(thumbnailPath);
      const base64 = buffer.toString("base64");
      return {
        success: true,
        data: `data:image/jpeg;base64,${base64}`,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ─── Update Photo Metadata ─────────────────────────────────────────────
  ipcMain.handle(
    "album:updatePhotoMetadata",
    async (_event, albumId, photoIds, metadata) => {
      try {
        const db = getPrisma();

        // Build the update data from provided metadata fields
        const data = {};
        if (metadata.title !== undefined) data.title = metadata.title || null;
        if (metadata.description !== undefined)
          data.description = metadata.description || null;
        if (metadata.keywords !== undefined) data.keywords = metadata.keywords;
        if (metadata.copyright !== undefined)
          data.copyright = metadata.copyright || null;
        if (metadata.artist !== undefined)
          data.artist = metadata.artist || null;
        if (metadata.dateCreated !== undefined)
          data.dateCreated = metadata.dateCreated || null;
        if (metadata.city !== undefined) data.city = metadata.city || null;
        if (metadata.state !== undefined) data.state = metadata.state || null;
        if (metadata.country !== undefined)
          data.country = metadata.country || null;
        if (metadata.gpsLatitude !== undefined)
          data.gpsLatitude =
            metadata.gpsLatitude != null
              ? parseFloat(metadata.gpsLatitude)
              : null;
        if (metadata.gpsLongitude !== undefined)
          data.gpsLongitude =
            metadata.gpsLongitude != null
              ? parseFloat(metadata.gpsLongitude)
              : null;

        // Update all specified photos that belong to this album
        const updated = await db.photo.updateMany({
          where: {
            id: { in: photoIds },
            albumId: albumId,
          },
          data,
        });

        return { success: true, updatedCount: updated.count };
      } catch (err) {
        console.error("[Album] Error updating photo metadata:", err);
        return { success: false, error: err.message };
      }
    },
  );

  // ─── Download Photos ───────────────────────────────────────────────────
  ipcMain.handle("album:downloadPhotos", async (event, photos) => {
    try {
      if (!photos || photos.length === 0) {
        return { success: false, error: "No photos selected" };
      }

      const win = BrowserWindow.getFocusedWindow();
      const total = photos.length;

      /** Send download progress to the renderer */
      function sendProgress(current, fileName, stage) {
        event.sender.send("album:downloadProgress", {
          current,
          total,
          fileName,
          stage,
        });
      }

      if (total === 1) {
        // Single photo: direct download with save dialog
        const photo = photos[0];
        const ext = path.extname(photo.originalFilename) || ".jpg";
        const defaultName = photo.originalFilename || `photo${ext}`;

        const { canceled, filePath: savePath } = await dialog.showSaveDialog(
          win,
          {
            title: "Guardar foto",
            defaultPath: defaultName,
            filters: [
              {
                name: "Fotos y Videos",
                extensions: ["jpg", "jpeg", "png", "cr2", "cr3", "nef", "arw", "orf", "rw2", "dng", "raf", "pef", "mp4"],
              },
              { name: "Todos los archivos", extensions: ["*"] },
            ],
          },
        );

        if (canceled || !savePath) {
          return { success: false, error: "cancelled" };
        }

        sendProgress(1, photo.originalFilename, "downloading");
        const buffer = await storage.downloadFile(photo.storedPath);

        sendProgress(1, photo.originalFilename, "saving");
        await fs.promises.writeFile(savePath, buffer);

        sendProgress(1, photo.originalFilename, "complete");
        return { success: true, savedPath: savePath };
      } else {
        // Multiple photos: zip file
        const { canceled, filePath: savePath } = await dialog.showSaveDialog(
          win,
          {
            title: "Guardar fotos como ZIP",
            defaultPath: "fotos.zip",
            filters: [{ name: "Archivo ZIP", extensions: ["zip"] }],
          },
        );

        if (canceled || !savePath) {
          return { success: false, error: "cancelled" };
        }

        // Create zip using archiver — download sequentially for progress reporting
        await new Promise((resolve, reject) => {
          const output = fs.createWriteStream(savePath);
          const archive = archiver("zip", { zlib: { level: 5 } });

          output.on("close", resolve);
          archive.on("error", reject);
          archive.pipe(output);

          // Track used filenames to avoid duplicates in zip
          const usedNames = new Set();

          // Download each file sequentially so progress is meaningful
          (async () => {
            for (let i = 0; i < total; i++) {
              const photo = photos[i];
              const filename = photo.originalFilename || "photo.jpg";

              sendProgress(i + 1, filename, "downloading");
              const buffer = await storage.downloadFile(photo.storedPath);

              // Handle duplicate filenames
              let safeName = filename;
              if (usedNames.has(safeName)) {
                const ext = path.extname(safeName);
                const base = path.basename(safeName, ext);
                let counter = 1;
                while (usedNames.has(`${base}_${counter}${ext}`)) {
                  counter++;
                }
                safeName = `${base}_${counter}${ext}`;
              }
              usedNames.add(safeName);

              sendProgress(i + 1, filename, "zipping");
              archive.append(buffer, { name: safeName });
            }

            sendProgress(total, "", "saving");
            archive.finalize();
          })().catch(reject);
        });

        sendProgress(total, "", "complete");
        return { success: true, savedPath: savePath, photoCount: total };
      }
    } catch (err) {
      console.error("[Album] Error downloading photos:", err);
      return { success: false, error: err.message };
    }
  });
}

/**
 * Cleanup: disconnect Prisma and SFTP.
 */
async function cleanup() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  await storage.disconnect();
}

module.exports = {
  registerAlbumHandlers,
  cleanup,
  getPrisma,
};
