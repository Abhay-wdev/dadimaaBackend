import cloudinary from "../config/cloudinary.js";

/**
 * Delete an image from Cloudinary using its full secure URL.
 * Automatically extracts the public ID and folder name.
 *
 * @param {string} imageUrl - The full Cloudinary image URL to delete
 * @returns {Promise<void>}
 */
const deleteCloudinaryImage = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string") return;

  try {
    // Example URL: https://res.cloudinary.com/yourname/image/upload/v1699123456/spice_testimonials/abcd1234.jpg
    const parts = imageUrl.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1 || parts.length < uploadIndex + 2) return;

    // Get the folder and public ID (without file extension)
    const publicPath = parts.slice(uploadIndex + 1).join("/");
    const publicId = publicPath.replace(/\.[^/.]+$/, ""); // remove file extension

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error("❌ Error deleting Cloudinary image:", error.message);
  }
};

export default deleteCloudinaryImage;
