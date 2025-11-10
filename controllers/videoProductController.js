import VideoProduct from "../models/videoProduct.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// ➕ CREATE Video Product (with image upload)
export const createVideoProduct = async (req, res) => {
  try {
    const { title, youtubeUrl, productUrl } = req.body;
    let thumbnailUrl = "";

    // ✅ Upload image if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "videoproducts",
      });
      thumbnailUrl = result.secure_url;
      fs.unlinkSync(req.file.path); // remove local temp file
    }

    if (!title || !youtubeUrl || !productUrl) {
      return res.status(400).json({ message: "All text fields are required." });
    }

    const newVideoProduct = await VideoProduct.create({
      title,
      thumbnail: thumbnailUrl,
      youtubeUrl,
      productUrl,
    });

    res.status(201).json({
      message: "🎬 Video product created successfully",
      videoProduct: newVideoProduct,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📖 READ All Video Products
export const getAllVideoProducts = async (req, res) => {
  try {
    const videoProducts = await VideoProduct.find().sort({ createdAt: -1 });
    res.json(videoProducts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📄 READ Single Video Product
export const getVideoProductById = async (req, res) => {
  try {
    const videoProduct = await VideoProduct.findById(req.params.id);
    if (!videoProduct)
      return res.status(404).json({ message: "Video product not found" });
    res.json(videoProduct);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✏️ UPDATE Video Product (with optional new image)
export const updateVideoProduct = async (req, res) => {
  try {
    const { title, youtubeUrl, productUrl } = req.body;
    let updatedData = { title, youtubeUrl, productUrl };

    // ✅ If new image uploaded
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "videoproducts",
      });
      updatedData.thumbnail = result.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const updatedVideoProduct = await VideoProduct.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (!updatedVideoProduct)
      return res.status(404).json({ message: "Video product not found" });

    res.json({
      message: "Video product updated successfully",
      videoProduct: updatedVideoProduct,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ❌ DELETE Video Product
export const deleteVideoProduct = async (req, res) => {
  try {
    const deletedVideoProduct = await VideoProduct.findByIdAndDelete(
      req.params.id
    );
    if (!deletedVideoProduct)
      return res.status(404).json({ message: "Video product not found" });

    res.json({ message: "Video product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
