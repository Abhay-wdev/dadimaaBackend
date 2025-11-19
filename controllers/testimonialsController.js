import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import Testimonial from "../models/testimonial.js";
import deleteCloudinaryImage from "../config/deleteCloudinaryImage.js";

// ✅ Safe file deletion helper
const safeUnlink = (filePath) => {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore silently if file not found
  }
};

// ✅ CREATE
export const createTestimonial = async (req, res) => {
  const { name, title, message } = req.body;

  // Basic validation
  if (!name || !title || !message) {
    safeUnlink(req.file?.path);
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    let imageUrl = "";

    // Upload image if provided
    if (req.file?.path) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "spice_testimonials",
        resource_type: "image",
      });
      imageUrl = uploadRes.secure_url;
      safeUnlink(req.file.path);
    } else {
      return res.status(400).json({ message: "Image is required." });
    }

    const newTestimonial = await Testimonial.create({
      name,
      title,
      message,
      image: imageUrl,
    });

    return res
      .status(201)
      .json({ message: "Testimonial created successfully", testimonial: newTestimonial });
  } catch (err) {
    safeUnlink(req.file?.path);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ READ ALL
export const getTestimonials = async (req, res) => {
  try {
    const { page = 1, limit = 0 } = req.query;
    const options = { sort: { createdAt: -1 } };

    let testimonials;
    if (Number(limit) > 0) {
      const skip = (Number(page) - 1) * Number(limit);
      testimonials = await Testimonial.find({}, null, options)
        .skip(skip)
        .limit(Number(limit));
      const total = await Testimonial.countDocuments();
      return res.json({
        data: testimonials,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } else {
      testimonials = await Testimonial.find({}, null, options);
      return res.json(testimonials);
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ READ ONE
export const getTestimonialById = async (req, res) => {
  try {
    const doc = await Testimonial.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Testimonial not found" });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ UPDATE
export const updateTestimonial = async (req, res) => {
  const { name, title, message } = req.body;

  try {
    // ✅ Ensure we have an ID from route params
    const id = req.params.id;
    if (!id) {
      safeUnlink(req.file?.path);
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    // ✅ Find existing testimonial
    const current = await Testimonial.findById(id);
    if (!current) {
      safeUnlink(req.file?.path);
      return res.status(404).json({ message: "Testimonial not found" });
    }

    // ✅ Build updates object
    const updates = {
      name: name ?? current.name,
      title: title ?? current.title,
      message: message ?? current.message,
    };

    // ✅ Replace image if new one uploaded
    if (req.file?.path) {
      // Delete old image from Cloudinary
      if (current.image) {
        try {
          await deleteCloudinaryImage(current.image);
        } catch (error) {
          console.warn("Failed to delete old Cloudinary image:", error.message);
        }
      }

      // Upload new image
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "spice_testimonials",
        resource_type: "image",
      });
      updates.image = uploadRes.secure_url;

      // Delete temp file
      safeUnlink(req.file.path);
    }

    // ✅ Update testimonial
    const updated = await Testimonial.findByIdAndUpdate(id, updates, {
      new: true,
    });

    return res.json({
      message: "Testimonial updated successfully",
      testimonial: updated,
    });
  } catch (err) {
    safeUnlink(req.file?.path);
    console.error("Error updating testimonial:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};


// ✅ DELETE
export const deleteTestimonial = async (req, res) => {
  try {
    const deleted = await Testimonial.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Testimonial not found" });

    // Delete from Cloudinary if exists
    if (deleted.image) {
      try {
        await deleteCloudinaryImage(deleted.image);
      } catch {}
    }

    return res.json({ message: "Testimonial deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
