import HeroImage from "../models/HeroImage.js";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";

// ======================================================================
// HELPERS
// ======================================================================

// Safely delete local file
const safeUnlink = (path) => {
  try {
    if (path && fs.existsSync(path)) fs.unlinkSync(path);
  } catch {}
};

// Extract Cloudinary Public ID
// https://res.cloudinary.com/.../upload/v123/folder/abc.jpg
//   → folder/abc
const extractPublicId = (url) => {
  if (!url) return null;

  const noParams = url.split("?")[0];
  const afterUpload = noParams.split("/upload/")[1];
  if (!afterUpload) return null;

  const parts = afterUpload.split("/");

  // Remove version (v1234)
  if (parts[0].startsWith("v")) parts.shift();

  const filePath = parts.join("/");
  return filePath.replace(/\.[^/.]+$/, "");
};

// UPLOAD IMAGE WRAPPER
const uploadImage = async (filePath, folder) => {
  const result = await cloudinary.uploader.upload(filePath, { folder });
  return result.secure_url;
};

// DELETE IMAGE FROM CLOUDINARY
const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.log("⚠️ Cloudinary delete error:", err.message);
  }
};

// ======================================================================
// GET ALL HERO IMAGES
// ======================================================================
export const getHeroImages = async (req, res) => {
  try {
    const heroImages = await HeroImage.find().sort({ sequence: 1 });
    res.status(200).json(heroImages);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching hero images",
      error: error.message,
    });
  }
};

// ======================================================================
// UPLOAD NEW HERO IMAGE
// ======================================================================
export const uploadHeroImages = async (req, res) => {
  try {
    const { link, sequence } = req.body;

    if (!req.files?.desktopImage?.length) {
      return res.status(400).json({ message: "Desktop image is required" });
    }

    const desktopFile = req.files.desktopImage[0];
    const mobileFile = req.files.mobileImage?.[0];

    // Upload desktop image
    const desktopURL = await uploadImage(desktopFile.path, "hero_images");
    safeUnlink(desktopFile.path);

    let mobileURL = null;
    if (mobileFile) {
      mobileURL = await uploadImage(mobileFile.path, "hero_images");
      safeUnlink(mobileFile.path);
    }

    const heroImage = await HeroImage.create({
      desktopImageUrl: desktopURL,
      mobileImageUrl: mobileURL,
      link,
      sequence: sequence ? parseInt(sequence) : 0,
    });

    res.status(201).json(heroImage);
  } catch (error) {
    res.status(500).json({
      message: "Error uploading hero image",
      error: error.message,
    });
  }
};

// ======================================================================
// UPDATE HERO IMAGE
// ======================================================================
export const updateHeroImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { link, sequence } = req.body;

    const heroImage = await HeroImage.findById(id);
    if (!heroImage) {
      return res.status(404).json({ message: "Hero image not found" });
    }

    // ----------------------------
    // UPDATE DESKTOP IMAGE (if new)
    // ----------------------------
    if (req.files?.desktopImage?.length > 0) {
      const file = req.files.desktopImage[0];

      // Delete old desktop img
      const oldPublicId = extractPublicId(heroImage.desktopImageUrl);
      await deleteImage(oldPublicId);

      // Upload new
      const newURL = await uploadImage(file.path, "hero_images");
      heroImage.desktopImageUrl = newURL;

      safeUnlink(file.path);
    }

    // ----------------------------
    // UPDATE MOBILE IMAGE (if new)
    // ----------------------------
    if (req.files?.mobileImage?.length > 0) {
      const file = req.files.mobileImage[0];

      // Delete old mobile img
      if (heroImage.mobileImageUrl) {
        const oldPublicId = extractPublicId(heroImage.mobileImageUrl);
        await deleteImage(oldPublicId);
      }

      // Upload new
      const newURL = await uploadImage(file.path, "hero_images");
      heroImage.mobileImageUrl = newURL;

      safeUnlink(file.path);
    }

    // Update text fields
    if (link !== undefined) heroImage.link = link;
    if (sequence !== undefined) heroImage.sequence = parseInt(sequence);

    const updated = await heroImage.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      message: "Error updating hero image",
      error: error.message,
    });
  }
};

// ======================================================================
// DELETE HERO IMAGE
// ======================================================================
export const deleteHeroImage = async (req, res) => {
  try {
    const heroImage = await HeroImage.findById(req.params.id);

    if (!heroImage) {
      return res.status(404).json({ message: "Hero image not found" });
    }

    // Delete desktop
    if (heroImage.desktopImageUrl) {
      const publicId = extractPublicId(heroImage.desktopImageUrl);
      await deleteImage(publicId);
    }

    // Delete mobile
    if (heroImage.mobileImageUrl) {
      const publicId = extractPublicId(heroImage.mobileImageUrl);
      await deleteImage(publicId);
    }

    await heroImage.deleteOne();

    res.status(200).json({ message: "Hero image deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting hero image",
      error: error.message,
    });
  }
};

// ======================================================================
// REORDER HERO IMAGES
// ======================================================================
export const reorderHeroImages = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: "Invalid updates format" });
    }

    const results = await Promise.all(
      updates.map(({ id, sequence }) =>
        HeroImage.findByIdAndUpdate(
          id,
          { sequence },
          { new: true, runValidators: true }
        )
      )
    );

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      message: "Error reordering hero images",
      error: error.message,
    });
  }
};
