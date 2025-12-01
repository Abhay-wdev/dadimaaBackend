import Product from "../models/productModel.js";
import Category from "../models/categoryModel.js";
import SubCategory from "../models/subCategoryModel.js";
import { v4 as uuidv4 } from "uuid";
import slugify from "slugify";
import cloudinary from "../config/cloudinary.js";

// ================================
// CREATE PRODUCT
// ================================
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subCategory,
      price,
      description,
      shortdescription,
      ingredients,
      shelfLife,
      storageInstructions,
      isVegetarian,
      allergenInfo,
      nutritionalInfo,
      weight,
      priorityNumber,
      discount,
      availabilityStatus,
      availabeQuantity,
      technicalDetails,
      faq,
      brand,
      manufacturer,
      tags,
      isActive,
    } = req.body;

    console.log("Request Body:", req.body);

    // Required field validation
    if (!name || !category || !price || !description || !shortdescription) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Get Category Data
    const categoryData = await Category.findById(category);
    if (!categoryData) return res.status(404).json({ message: "Category not found" });

    // Get Subcategory Data + Slug
    let subCategoryData = null;
    let subCategorySlug = null;
    if (subCategory) {
      subCategoryData = await SubCategory.findById(subCategory);
      if (!subCategoryData)
        return res.status(404).json({ message: "Subcategory not found" });

      subCategorySlug = subCategoryData.slug; // ✅ Extract slug from subcategory
    }

    // Create product slug & ID
    const slug = slugify(name, { lower: true });
    const productId = `PROD-${uuidv4().slice(0, 8)}`;

    // Upload images to Cloudinary
    let imageUrls = [];
    if (req.files?.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        )
      );
      imageUrls = uploads.map((u) => u.secure_url);
    }

    // ✅ Create product with subCategorySlug included
    const product = new Product({
      name,
      slug,
      productId,
      category,
      subCategory,
      subCategorySlug, // ✅ Save slug in product document
      price,
      description,
      shortdescription,
      ingredients: ingredients ? JSON.parse(ingredients) : [],
      shelfLife,
      storageInstructions,
      isVegetarian: isVegetarian !== undefined ? isVegetarian : true,
      allergenInfo,
      nutritionalInfo: nutritionalInfo ? JSON.parse(nutritionalInfo) : { per: "100g", values: [] },
      weight,
      priorityNumber: priorityNumber || 0,
      discount: discount || 0,
      images: imageUrls,
      availabilityStatus: availabilityStatus || "In Stock",
      availabeQuantity: availabeQuantity || 0,
      technicalDetails: technicalDetails ? JSON.parse(technicalDetails) : {},
      faq: faq ? JSON.parse(faq) : [],
      brand,
      manufacturer,
      tags: tags ? JSON.parse(tags) : [],
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await product.save();
    await saved.populate("category", "name slug");
    await saved.populate("subCategory", "name slug");

    res.status(201).json(saved);
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================================
// GET ALL PRODUCTS WITH FILTER
// ================================
export const getProducts = async (req, res) => {
  try {
    const { search = "", category, subCategory, limit = 50 } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;

    const products = await Product.find(query)
      .limit(Number(limit))
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getProductsCards = async (req, res) => {
  try {
    const { search = "", category, subCategory, limit = 50 } = req.query;

    const query = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;

    const products = await Product.find(query)
      .select("_id name slug category weight  priorityNumber subCategory shortdescription price discount images") // ✅ only pick these fields
      .limit(Number(limit))
      .populate("category", "_id name slug") // ✅ only these fields from category
      .populate("subCategory", "_id name slug") // ✅ only these fields from subCategory
      .sort({ createdAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET SINGLE PRODUCT
// ================================
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("subCategory", "name");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    console.error("Get Product By ID Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ================================
// GET SINGLE PRODUCT BY SLUG
// ================================
export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    const product = await Product.findOne({ slug })
      .populate("category", "name slug")
      .populate("subCategory", "name slug");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error) {
    console.error("Get Product By Slug Error:", error);
    res.status(500).json({ message: error.message });
  }
};


// ================================
// UPDATE PRODUCT
// ================================
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const parseJSON = (data) => {
      if (!data) return undefined;
      try { return JSON.parse(data); } catch { return data; }
    };

    const imagesToRemove = parseJSON(req.body.imagesToRemove) || [];
    const imageSequence = parseJSON(req.body.imageSequence) || [];

    let updatedImages = [...(product.images || [])];
    for (const url of imagesToRemove) {
      try {
        const parts = url.split("/");
        const publicIdWithExt = parts.slice(-2).join("/");
        const publicId = publicIdWithExt.split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) { console.error("Cloudinary delete error:", err); }
    }
    updatedImages = updatedImages.filter(url => !imagesToRemove.includes(url));

    let newImageUrls = [];
    if (req.files?.length > 0) {
      const uploads = await Promise.all(
        req.files.map(file => cloudinary.uploader.upload(file.path, { folder: "products" }))
      );
      newImageUrls = uploads.map(u => u.secure_url);
    }
    updatedImages = [...updatedImages, ...newImageUrls];

    if (imageSequence.length > 0) {
      const validSequence = imageSequence.filter(url => updatedImages.includes(url));
      const missing = updatedImages.filter(url => !validSequence.includes(url));
      updatedImages = [...validSequence, ...missing];
    }

    const fieldsToUpdate = {
      name: req.body.name || product.name,
      slug: req.body.name ? slugify(req.body.name, { lower: true }) : product.slug,
      category: req.body.category || product.category,
      subCategory: req.body.subCategory || product.subCategory,
      price: req.body.price || product.price,
      description: req.body.description || product.description,
      shortdescription: req.body.shortdescription || product.shortdescription,
      ingredients: parseJSON(req.body.ingredients) || product.ingredients,
      shelfLife: req.body.shelfLife || product.shelfLife,
      storageInstructions: req.body.storageInstructions || product.storageInstructions,
      isVegetarian: req.body.isVegetarian !== undefined ? req.body.isVegetarian : product.isVegetarian,
      allergenInfo: req.body.allergenInfo || product.allergenInfo,
      nutritionalInfo: parseJSON(req.body.nutritionalInfo) || product.nutritionalInfo,
      weight: req.body.weight || product.weight,

          
      priorityNumber: req.body.priorityNumber !== undefined ? req.body.priorityNumber : product.priorityNumber,
      discount: req.body.discount !== undefined ? req.body.discount : product.discount,
      images: updatedImages,
      availabilityStatus: req.body.availabilityStatus || product.availabilityStatus,
      availabeQuantity: req.body.availabeQuantity || product.availabeQuantity,
      technicalDetails: parseJSON(req.body.technicalDetails) || product.technicalDetails,
      faq: parseJSON(req.body.faq) || product.faq,
      brand: req.body.brand || product.brand,
      manufacturer: req.body.manufacturer || product.manufacturer,
      tags: parseJSON(req.body.tags) || product.tags,
      isActive: req.body.isActive !== undefined ? req.body.isActive : product.isActive,
    };

    Object.assign(product, fieldsToUpdate);
    const updated = await product.save();
    await updated.populate("category", "name");
    await updated.populate("subCategory", "name");

    res.status(200).json(updated);
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// ================================
// DELETE PRODUCT
// ================================
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.images?.length) {
      for (const url of product.images) {
        try {
          const parts = url.split("/");
          const publicIdWithExt = parts.slice(-2).join("/");
          const publicId = publicIdWithExt.split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// ================================
// GET PRODUCTS BY SUBCATEGORY ID
// ================================
export const getProductsBySubCategoryId = async (req, res) => {
  try {
    const { subCategoryId } = req.params;

    if (!subCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Subcategory ID is required",
      });
    }

    // Find all products where subCategory matches
    const products = await Product.find({ subCategory: subCategoryId })
      .populate("category", "name slug")
      .populate("subCategory", "name slug")
      .sort({ createdAt: -1 });

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this subcategory",
      });
    }

    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get Products By SubCategory Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
