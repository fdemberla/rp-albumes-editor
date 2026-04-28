const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const path = require("path");
const os = require("os");
const fs = require("fs");

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Compress a photo for storage.
 * - Converts to JPEG at 85-90% quality
 * - Resizes if the longest side exceeds maxDimension
 * - Preserves EXIF orientation (auto-rotate)
 *
 * @param {string} inputPath - Path to the source image file
 * @param {object} [options]
 * @param {number} [options.quality=88] - JPEG quality (1-100)
 * @param {number} [options.maxDimension=4000] - Max pixels for the longest side
 * @returns {Promise<{buffer: Buffer, width: number, height: number, size: number}>}
 */
async function compressPhoto(inputPath, options = {}) {
  const quality = options.quality || 88;
  const maxDimension = options.maxDimension || 4000;

  let pipeline = sharp(inputPath).rotate().withMetadata(); // auto-rotate + preserve EXIF

  // Get original metadata to decide if resize is needed
  const metadata = await sharp(inputPath).metadata();
  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;

  if (origWidth > maxDimension || origHeight > maxDimension) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const outputBuffer = await pipeline
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: outputBuffer.data,
    width: outputBuffer.info.width,
    height: outputBuffer.info.height,
    size: outputBuffer.info.size,
  };
}

/**
 * Generate a small thumbnail for preview/gallery views.
 *
 * @param {string} inputPath - Path to the source image file
 * @param {object} [options]
 * @param {number} [options.width=400] - Thumbnail width in pixels
 * @param {number} [options.quality=75] - JPEG quality
 * @returns {Promise<{buffer: Buffer, width: number, height: number, size: number}>}
 */
async function generateThumbnail(inputPath, options = {}) {
  const thumbWidth = options.width || 400;
  const quality = options.quality || 75;

  const outputBuffer = await sharp(inputPath)
    .rotate() // auto-rotate based on EXIF
    .withMetadata() // preserve EXIF
    .resize({
      width: thumbWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: outputBuffer.data,
    width: outputBuffer.info.width,
    height: outputBuffer.info.height,
    size: outputBuffer.info.size,
  };
}

/** RAW image extensions supported by the app. */
const RAW_EXTENSIONS = [
  ".cr2",
  ".cr3",
  ".nef",
  ".arw",
  ".orf",
  ".rw2",
  ".dng",
  ".raf",
  ".pef",
];

/**
 * Check if a file is a video based on its extension.
 * @param {string} filePath
 * @returns {boolean}
 */
function isVideoFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".mp4"].includes(ext);
}

/**
 * Check if a file is a RAW image based on its extension.
 * @param {string} filePath
 * @returns {boolean}
 */
function isRawFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return RAW_EXTENSIONS.includes(ext);
}

/**
 * Generate a JPEG thumbnail from a video file by extracting a frame at 1 second.
 *
 * @param {string} inputPath - Path to the source video file
 * @param {object} [options]
 * @param {number} [options.width=400] - Thumbnail width in pixels
 * @param {number} [options.quality=75] - JPEG quality
 * @returns {Promise<{buffer: Buffer, width: number, height: number, size: number}>}
 */
async function generateVideoThumbnail(inputPath, options = {}) {
  const thumbWidth = options.width || 400;
  const quality = options.quality || 75;

  // Extract a frame from the video to a temp file
  const tmpDir = os.tmpdir();
  const tmpFilename = `thumb_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const tmpPath = path.join(tmpDir, tmpFilename);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("error", reject)
      .on("end", resolve)
      .screenshots({
        count: 1,
        timemarks: ["00:00:01"],
        folder: tmpDir,
        filename: tmpFilename,
        size: `${thumbWidth}x?`,
      });
  });

  // Process the extracted frame with sharp for consistent output
  const outputBuffer = await sharp(tmpPath)
    .resize({ width: thumbWidth, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  // Clean up temp file
  try {
    fs.unlinkSync(tmpPath);
  } catch {
    // ignore cleanup errors
  }

  return {
    buffer: outputBuffer.data,
    width: outputBuffer.info.width,
    height: outputBuffer.info.height,
    size: outputBuffer.info.size,
  };
}

module.exports = {
  compressPhoto,
  generateThumbnail,
  generateVideoThumbnail,
  isVideoFile,
  isRawFile,
};
