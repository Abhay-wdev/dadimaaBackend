import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import CategoryCard from "../models/category.js"; // ✅ Model name fixed

// Helper to safely remove temp file
const safeUnlink = (p) => {
  if (!p) return;
  try {
    fs.unlinkSync(p);
  } catch {}
};

// CREATE
export const createCategoryCard = async (req, res) => {
  const { name, description, slug, link } = req.body;

  if (!name || !description || !slug || !link) {
    safeUnlink(req.file?.path);
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const exists = await CategoryCard.findOne({ slug: slug.toLowerCase() });
    if (exists) {
      safeUnlink(req.file?.path);
      return res.status(409).json({ message: "Slug already exists." });
    }

    let imageUrl = "";
    if (req.file?.path) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "categories",
        resource_type: "image",
      });
      imageUrl = upload.secure_url;
      safeUnlink(req.file.path);
    } else {
      return res.status(400).json({ message: "Image is required." });
    }

    // ✅ Create a new document
    const newCategory = await CategoryCard.create({
      name,
      description,
      slug: slug.toLowerCase(),
      link,
      image: imageUrl,
    });

    return res
      .status(201)
      .json({ message: "Category created successfully", category: newCategory });
  } catch (err) {
    safeUnlink(req.file?.path);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// READ ALL (optionally paginated)
export const getCategoriesCards = async (req, res) => {
  try {
    const { page = 1, limit = 0 } = req.query; // set limit > 0 for pagination
    const options = { sort: { createdAt: -1 } };

    let categories;
    if (Number(limit) > 0) {
      const skip = (Number(page) - 1) * Number(limit);
      categories = await CategoryCard.find({}, null, options)
        .skip(skip)
        .limit(Number(limit));
      const total = await CategoryCard.countDocuments();
      return res.json({
        data: categories,
        total,
        page: Number(page),
        limit: Number(limit),
      });
    } else {
      categories = await CategoryCard.find({}, null, options);
      return res.json(categories);
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// READ ONE
export const getCategoryCardById = async (req, res) => {
  try {
    const doc = await CategoryCard.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ message: "Category not found" });
    return res.json(doc);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// UPDATE (image optional)
export const updateCategoryCard = async (req, res) => {
  const { name, description, slug, link } = req.body;

  try {
    const current = await CategoryCard.findById(req.params.id);
    if (!current) {
      safeUnlink(req.file?.path);
      return res.status(404).json({ message: "Category not found" });
    }

    // If slug is changing, ensure uniqueness
    if (slug && slug.toLowerCase() !== current.slug) {
      const dup = await CategoryCard.findOne({ slug: slug.toLowerCase() });
      if (dup) {
        safeUnlink(req.file?.path);
        return res.status(409).json({ message: "Slug already exists." });
      }
    }

    const updates = {
      name: name ?? current.name,
      description: description ?? current.description,
      slug: slug ? slug.toLowerCase() : current.slug,
      link: link ?? current.link,
    };

    if (req.file?.path) {
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: "categories",
        resource_type: "image",
      });
      updates.image = upload.secure_url;
      safeUnlink(req.file.path);
    }

    const updated = await CategoryCard.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    return res.json({
      message: "Category updated successfully",
      category: updated,
    });
  } catch (err) {
    safeUnlink(req.file?.path);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE
export const deleteCategoryCard = async (req, res) => {
  try {
    const deleted = await CategoryCard.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Category not found" });
    return res.json({ message: "Category deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
