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
    if (!name || !category || price === undefined || !description || !shortdescription) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Helper: safe number parsing + rounding
    const toNumber = (v, fallback = 0) => {
      if (v === undefined || v === null || v === "") return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const round = (value, decimals = 2) => {
      const n = toNumber(value, 0);
      const factor = Math.pow(10, decimals);
      return Math.round(n * factor) / factor;
    };

    // Parse & round numeric fields
    const parsedPrice = round(price, 2); // price to 2 decimals
    const parsedDiscount = round(discount, 2); // discount to 2 decimals
    const parsedWeight = round(weight, 2); // weight (e.g., grams) to 2 decimals
    const parsedPriority = Math.round(toNumber(priorityNumber, 0)); // integer
    const parsedAvailableQty = Math.round(toNumber(availabeQuantity, 0)); // integer

    // Parse JSON fields safely
    const parsedIngredients = ingredients ? JSON.parse(ingredients) : [];
    const parsedNutritional =
      nutritionalInfo && typeof nutritionalInfo === "string"
        ? JSON.parse(nutritionalInfo)
        : nutritionalInfo || { per: "100g", values: [] };

    // Round nutritional values if present and numeric
    if (parsedNutritional && Array.isArray(parsedNutritional.values)) {
      parsedNutritional.values = parsedNutritional.values.map((item) => {
        // item could be { label: 'Protein', value: '3.45' } or similar
        if (item && Object.prototype.hasOwnProperty.call(item, "value")) {
          const roundedValue = round(item.value, 2);
          return { ...item, value: roundedValue };
        }
        return item;
      });
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

    // ✅ Create product with rounded numeric values
    const product = new Product({
      name,
      slug,
      productId,
      category,
      subCategory,
      subCategorySlug, // ✅ Save slug in product document
      price: parsedPrice,
      description,
      shortdescription,
      ingredients: parsedIngredients,
      shelfLife,
      storageInstructions,
      isVegetarian: isVegetarian !== undefined ? isVegetarian : true,
      allergenInfo,
      nutritionalInfo: parsedNutritional,
      weight: parsedWeight,
      priorityNumber: parsedPriority,
      discount: parsedDiscount,
      images: imageUrls,
      availabilityStatus: availabilityStatus || "In Stock",
      availabeQuantity: parsedAvailableQty,
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
      if (data === undefined || data === null) return undefined;
      try { return typeof data === "string" ? JSON.parse(data) : data; } catch { return data; }
    };

    // Helpers for numeric parsing + rounding
    const toNumber = (v, fallback = undefined) => {
      if (v === undefined || v === null || v === "") return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const round = (value, decimals = 2, fallback = undefined) => {
      const n = toNumber(value, fallback);
      if (n === undefined) return undefined;
      const factor = Math.pow(10, decimals);
      return Math.round(n * factor) / factor;
    };

    // Images removal
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
    updatedImages = updatedImages.filter((url) => !imagesToRemove.includes(url));

    // Upload new images if any
    let newImageUrls = [];
    if (req.files?.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) => cloudinary.uploader.upload(file.path, { folder: "products" }))
      );
      newImageUrls = uploads.map((u) => u.secure_url);
    }
    updatedImages = [...updatedImages, ...newImageUrls];

    // Reorder images if sequence provided
    if (imageSequence.length > 0) {
      const validSequence = imageSequence.filter((url) => updatedImages.includes(url));
      const missing = updatedImages.filter((url) => !validSequence.includes(url));
      updatedImages = [...validSequence, ...missing];
    }

    // Handle subCategorySlug if subCategory changed
    let subCategorySlug = product.subCategorySlug;
    if (req.body.subCategory && String(req.body.subCategory) !== String(product.subCategory)) {
      try {
        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(404).json({ message: "Subcategory not found" });
        subCategorySlug = subCat.slug;
      } catch (err) {
        console.error("Subcategory lookup error:", err);
        return res.status(500).json({ message: "Error fetching subcategory" });
      }
    }

    // Parse JSON fields
    const parsedIngredients = parseJSON(req.body.ingredients) ?? product.ingredients;
    const parsedTechnical = parseJSON(req.body.technicalDetails) ?? product.technicalDetails;
    const parsedFaq = parseJSON(req.body.faq) ?? product.faq;
    const parsedTags = parseJSON(req.body.tags) ?? product.tags;

    // Nutritional info: parse if provided, else use existing
    let parsedNutritional =
      parseJSON(req.body.nutritionalInfo) ?? product.nutritionalInfo ?? { per: "100g", values: [] };

    // Ensure nutritional structure and round numeric values
    if (!parsedNutritional.per) parsedNutritional.per = parsedNutritional.per || "100g";
    if (Array.isArray(parsedNutritional.values)) {
      parsedNutritional.values = parsedNutritional.values.map((item) => {
        if (item && Object.prototype.hasOwnProperty.call(item, "value")) {
          // round numeric value if possible, else keep as-is
          const rounded = round(item.value, 2, item.value);
          return { ...item, value: rounded !== undefined ? rounded : item.value };
        }
        return item;
      });
    }

    // Numeric fields: if provided (even 0), use parsed+rounded; otherwise keep existing
    const parsedPrice = req.body.price !== undefined ? round(req.body.price, 2, product.price) : product.price;
    const parsedDiscount = req.body.discount !== undefined ? round(req.body.discount, 2, product.discount) : product.discount;
    const parsedWeight = req.body.weight !== undefined ? round(req.body.weight, 2, product.weight) : product.weight;
    const parsedPriority = req.body.priorityNumber !== undefined ? Math.round(toNumber(req.body.priorityNumber, product.priorityNumber ?? 0)) : product.priorityNumber;
    const parsedAvailableQty = req.body.availabeQuantity !== undefined ? Math.round(toNumber(req.body.availabeQuantity, product.availabeQuantity ?? 0)) : product.availabeQuantity;

    // Build update object (preserve values if field not provided)
    const fieldsToUpdate = {
      name: req.body.name !== undefined ? req.body.name : product.name,
      slug: req.body.name ? slugify(req.body.name, { lower: true }) : product.slug,
      category: req.body.category !== undefined ? req.body.category : product.category,
      subCategory: req.body.subCategory !== undefined ? req.body.subCategory : product.subCategory,
      subCategorySlug,
      price: parsedPrice,
      description: req.body.description !== undefined ? req.body.description : product.description,
      shortdescription: req.body.shortdescription !== undefined ? req.body.shortdescription : product.shortdescription,
      ingredients: parsedIngredients,
      shelfLife: req.body.shelfLife !== undefined ? req.body.shelfLife : product.shelfLife,
      storageInstructions: req.body.storageInstructions !== undefined ? req.body.storageInstructions : product.storageInstructions,
      isVegetarian: req.body.isVegetarian !== undefined ? req.body.isVegetarian : product.isVegetarian,
      allergenInfo: req.body.allergenInfo !== undefined ? req.body.allergenInfo : product.allergenInfo,
      nutritionalInfo: parsedNutritional,
      weight: parsedWeight,
      priorityNumber: parsedPriority,
      discount: parsedDiscount,
      images: updatedImages,
      availabilityStatus: req.body.availabilityStatus !== undefined ? req.body.availabilityStatus : product.availabilityStatus,
      availabeQuantity: parsedAvailableQty,
      technicalDetails: parsedTechnical,
      faq: parsedFaq,
      brand: req.body.brand !== undefined ? req.body.brand : product.brand,
      manufacturer: req.body.manufacturer !== undefined ? req.body.manufacturer : product.manufacturer,
      tags: parsedTags,
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
