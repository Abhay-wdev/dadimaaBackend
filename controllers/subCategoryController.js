import SubCategory from "../models/subCategoryModel.js";
import Category from "../models/categoryModel.js";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";
import cloudinary from "../config/cloudinary.js";
import Product from "../models/productModel.js";
import fs from "fs";


const safeUnlink = (path) => {
  try {
    if (path && fs.existsSync(path)) fs.unlinkSync(path);
  } catch {}
};

const extractPublicId = (url) => {
  if (!url) return null;

  const noParams = url.split("?")[0];
  const afterUpload = noParams.split("/upload/")[1];
  if (!afterUpload) return null;

  const parts = afterUpload.split("/");

  if (parts[0].startsWith("v")) parts.shift();

  const filePath = parts.join("/");
  return filePath.replace(/\.[^/.]+$/, "");
};
// ================================
// CREATE SUBCATEGORY
// ================================
export const createSubCategory = async (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: "Name and Category are required" });
    }

    // Check if parent category exists
    const parentCategory = await Category.findById(category);
    if (!parentCategory)
      return res.status(404).json({ message: "Parent Category not found" });

    // Generate slug
    const slug = slugify(name, { lower: true });

    // Handle optional image upload
    let imageUrl = "";
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "subcategories",
      });
      imageUrl = result.secure_url;
    }

    const newSubCategory = new SubCategory({
      name,
      slug,
      category,
      description,
      image: imageUrl,
    });

    const savedSubCategory = await newSubCategory.save();
    res.status(201).json(savedSubCategory);
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET ALL SUBCATEGORIES
// ================================
export const getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find()
      .populate("category", "name slug") // populate parent category
      .sort({ createdAt: -1 });

    res.status(200).json(subCategories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET SINGLE SUBCATEGORY
// ================================
// Get all subcategories by category ID
// Get all subcategories by category ID
export const getSubCategoriesByCategoryId = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Find all subcategories with this category ID
    const subCategories = await SubCategory.find({ category: categoryId }).populate(
      "category",
      "name slug"
    );

    if (!subCategories || subCategories.length === 0)
      return res.status(404).json({ 
        success: false, 
        message: "No subcategories found for this category" 
      });

    res.status(200).json({
      success: true,
      message: "Subcategories retrieved successfully",
      data: subCategories
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};



// ================================
// UPDATE SUBCATEGORY
// ================================
export const updateSubCategory = async (req, res) => {
  try {
    const { name, category, description, isActive } = req.body;

    const subCategory = await SubCategory.findById(req.params.id);
    if (!subCategory) {
      if (req.file?.path) safeUnlink(req.file.path);
      return res.status(404).json({ message: "SubCategory not found" });
    }

    // ================================
    // 1️⃣ Update name + slug
    // ================================
    if (name) {
      subCategory.name = name;
      subCategory.slug = slugify(name, { lower: true });
    }

    // ================================
    // 2️⃣ Update parent category
    // ================================
    if (category) {
      const parentCategory = await Category.findById(category);
      if (!parentCategory) {
        if (req.file?.path) safeUnlink(req.file.path);
        return res.status(404).json({ message: "Parent Category not found" });
      }
      subCategory.category = category;
    }

    // ================================
    // 3️⃣ Update simple fields
    // ================================
    if (description !== undefined) subCategory.description = description;
    if (isActive !== undefined) subCategory.isActive = isActive;

    // ================================
    // 4️⃣ Update image if provided
    // ================================
    if (req.file) {
      // Delete old image from Cloudinary
      if (subCategory.image) {
        const publicId = extractPublicId(subCategory.image);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.log("⚠️ Failed to delete old subcategory image:", err.message);
          }
        }
      }

      // Upload new image
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "subcategories",
      });

      subCategory.image = uploadResult.secure_url;

      // Remove temp file
      safeUnlink(req.file.path);
    }

    // ================================
    // 5️⃣ Save updated document
    // ================================
    const updatedSubCategory = await subCategory.save();

    res.status(200).json({
      success: true,
      message: "SubCategory updated successfully",
      data: updatedSubCategory,
    });

  } catch (error) {
    safeUnlink(req.file?.path);
    res.status(500).json({ message: error.message });
  }
};

// ================================
// DELETE SUBCATEGORY
// ================================
export const deleteSubCategory = async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    // ================================
    // 1️⃣ DELETE SUBCATEGORY IMAGE
    // ================================
    if (subCategory.image) {
      const publicId = extractPublicId(subCategory.image);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.log("⚠️ Error deleting subcategory image:", err.message);
        }
      }
    }

    // ================================
    // 2️⃣ FIND ALL PRODUCTS UNDER THIS SUBCATEGORY
    // ================================
    const products = await Product.find({ subCategory: req.params.id });

    // ================================
    // 3️⃣ DELETE THEIR IMAGES FROM CLOUDINARY
    // ================================
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        for (const url of product.images) {
          const publicId = extractPublicId(url);
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (err) {
              console.log("⚠️ Error deleting product image:", err.message);
            }
          }
        }
      }
    }

    // ================================
    // 4️⃣ DELETE ALL PRODUCTS
    // ================================
    await Product.deleteMany({ subCategory: req.params.id });

    // ================================
    // 5️⃣ DELETE THE SUBCATEGORY ITSELF
    // ================================
    await subCategory.deleteOne();

    res.status(200).json({
      success: true,
      message: "SubCategory and all related products deleted successfully",
      deletedProductsCount: products.length
    });

  } catch (error) {
    console.error("❌ Delete SubCategory Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET SUBCATEGORIES BY CATEGORY SLUG
// ================================
export const getSubCategoriesByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Find subcategory by slug
    const subCategory = await SubCategory.findOne({ slug })
      .populate("category", "name slug");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "SubCategory retrieved successfully",
      data: {
        _id: subCategory._id,
        name: subCategory.name,
        slug: subCategory.slug,
        isActive: subCategory.isActive,
      },
    });
  } catch (error) {
    console.error("Error fetching subcategory by slug:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// EXPORT DEFAULT
// ================================
export default {
  createSubCategory,
  getSubCategories,
  getSubCategoriesByCategoryId,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategorySlug,
};
