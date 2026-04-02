const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer - Image file buffer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadImage(buffer, folder = "satyam-holidays/packages") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { quality: "auto", fetch_format: "auto" },
          { width: 1200, crop: "limit" },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload failed:", error);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by public ID
 * @param {string} publicId
 */
async function deleteImage(publicId) {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Cloudinary image deleted: ${publicId}`);
  } catch (error) {
    logger.error("Cloudinary delete failed:", error);
  }
}

module.exports = { uploadImage, deleteImage, cloudinary };
