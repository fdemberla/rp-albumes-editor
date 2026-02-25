const sharp = require("sharp");

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

  let pipeline = sharp(inputPath).rotate(); // auto-rotate based on EXIF

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

module.exports = {
  compressPhoto,
  generateThumbnail,
};
