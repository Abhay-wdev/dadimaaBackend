import { v2 as cloudinary } from "cloudinary";

/**
 * Extract publicId from Cloudinary URL
 */
export const extractPublicId = (url) => {
  if (!url) return null;

  const noParams = url.split("?")[0];
  const afterUpload = noParams.split("/upload/")[1];
  if (!afterUpload) return null;

  const parts = afterUpload.split("/");

  // Remove version folder (v167275..., v17630..., etc.)
  if (parts[0].startsWith("v")) parts.shift();

  const filePath = parts.join("/");

  return filePath.replace(/\.[^/.]+$/, ""); // remove extension
};

/**
 * Delete single image
 */
export const deleteCloudinaryImage = async (url) => {
  try {
    const publicId = extractPublicId(url);
    if (!publicId) return null;

    const result = await cloudinary.uploader.destroy(publicId);
    console.log("🗑️ Deleted:", publicId);
    return result;
  } catch (error) {
    console.log("❌ Delete Error:", error);
  }
};

/**
 * Delete multiple images
 */
export const deleteMultipleCloudinaryImages = async (urls = []) => {
  const results = [];
  for (const url of urls) {
    const publicId = extractPublicId(url);
    if (!publicId) continue;

    const result = await cloudinary.uploader.destroy(publicId);
    console.log("🗑️ Deleted:", publicId);
    results.push(result);
  }
  return results;
};
