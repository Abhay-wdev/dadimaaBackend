import Blog from "../models/blogModel.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// ---------------------------
// Helper to safely remove temp files
// ---------------------------
const safeUnlink = (path) => {
  try {
    if (path && fs.existsSync(path)) fs.unlinkSync(path);
  } catch {}
};

// ---------------------------
// Extract Cloudinary public ID
// ---------------------------
const extractPublicId = (url) => {
  if (!url) return null;

  const noParams = url.split("?")[0];
  const afterUpload = noParams.split("/upload/")[1];
  if (!afterUpload) return null;

  const parts = afterUpload.split("/");

  // Remove version folder (v123...)
  if (parts[0].startsWith("v")) parts.shift();

  const filePath = parts.join("/");
  return filePath.replace(/\.[^/.]+$/, ""); // remove extension
};

// ========================
// 🟢 Create Blog
// ========================
export const createBlog = async (req, res) => {
  try {
    const { title, content, author, htmlContent, category, tags, isPublished } =
      req.body;

    let imageUrl = "";

    // Upload image if provided
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "blogs",
      });
      imageUrl = uploadRes.secure_url;
      safeUnlink(req.file.path);
    }

    // Parse content safely
    let parsedContent = content;
    if (typeof content === "string") {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        parsedContent = {
          blocks: [{ type: "paragraph", data: { text: content } }],
        };
      }
    }

    const newBlog = await Blog.create({
      title,
      slug: title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      content: parsedContent,
      htmlContent,
      author,
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      isPublished: isPublished === "true" || isPublished === true,
      image: imageUrl,
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: newBlog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// 🟡 Get All Blogs
// ========================
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// 🟡 Get Blog by ID
// ========================
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res.status(404).json({ success: false, message: "Blog not found" });

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// 🟡 Get Blog by Slug
// ========================
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (!blog)
      return res.status(404).json({ success: false, message: "Blog not found" });

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// 🔵 Update Blog
// ========================
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);
    if (!blog)
      return res.status(404).json({ success: false, message: "Blog not found" });

    const { title, author, category, tags, htmlContent, isPublished } =
      req.body;

    // Parse content safely
    let content = req.body.content;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        content = blog.content;
      }
    }

    const updateData = {
      title: title || blog.title,
      author: author || blog.author,
      category: category || blog.category,
      htmlContent: htmlContent || blog.htmlContent,
      content,
      tags: tags ? tags.split(",").map((t) => t.trim()) : blog.tags,
      isPublished:
        isPublished === "true" || isPublished === true
          ? true
          : isPublished === "false" || isPublished === false
          ? false
          : blog.isPublished,
    };

    // Update slug if title changed
    if (title && title !== blog.title) {
      updateData.slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    // ------------------------------
    // Handle image replacement
    // ------------------------------
    if (req.file) {
      // Delete old image
      if (blog.image) {
        const publicId = extractPublicId(blog.image);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.warn("⚠ Failed to delete old image:", err.message);
          }
        }
      }

      // Upload new image
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "blogs",
      });

      updateData.image = uploadRes.secure_url;
      safeUnlink(req.file.path);
    }

    const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);
    safeUnlink(req.file?.path);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// 🔴 Delete Blog
// ========================
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog)
      return res.status(404).json({ success: false, message: "Blog not found" });

    if (blog.image) {
      const publicId = extractPublicId(blog.image);
      if (publicId) await cloudinary.uploader.destroy(publicId);
    }

    await blog.deleteOne();

    res.json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
