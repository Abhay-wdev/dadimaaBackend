import Company from "../models/companyModal.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// ======================================================================
// SAFE HELPERS
// ======================================================================
const safeUnlink = (path) => {
  try {
    if (path && fs.existsSync(path)) fs.unlinkSync(path);
  } catch {}
};

// Extract Public ID from Cloudinary URL
// https://res.cloudinary.com/.../upload/v123/company_logos/abc.jpg
// ➝ company_logos/abc
const extractPublicId = (url) => {
  if (!url) return null;

  const noParams = url.split("?")[0];
  const afterUpload = noParams.split("/upload/")[1];
  if (!afterUpload) return null;

  const parts = afterUpload.split("/");

  // Remove version (v123...)
  if (parts[0].startsWith("v")) parts.shift();

  const filePath = parts.join("/");
  return filePath.replace(/\.[^/.]+$/, "");
};

// ======================================================================
// CREATE OR UPDATE COMPANY
// ======================================================================
export const createOrUpdateCompany = async (req, res) => {
  try {
    let data = { ...req.body };

    // ---------- JSON parsing ----------
    const parseIfJSON = (v) => {
      try {
        return typeof v === "string" ? JSON.parse(v) : v;
      } catch {
        return v;
      }
    };
    data.address = parseIfJSON(data.address);
    data.directors = parseIfJSON(data.directors);
    data.socialLinks = parseIfJSON(data.socialLinks);

    // ---------- Validation ----------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    let existingCompany = await Company.findOne();

    const updatedSocialLinks = [...(data.socialLinks || [])];

    // ==================================================================
    // FILE UPLOAD HANDLING (Logo + dynamic social icons)
    // ==================================================================
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // -------------------------------------------------------------
          // 1️⃣ COMPANY LOGO
          // -------------------------------------------------------------
          if (file.fieldname === "logo") {
            // Delete old logo
            if (existingCompany?.logo) {
              const publicId = extractPublicId(existingCompany.logo);
              if (publicId) await cloudinary.uploader.destroy(publicId);
            }

            // Upload new logo
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "company_logos",
            });

            data.logo = result.secure_url;
          }

          // -------------------------------------------------------------
          // 2️⃣ SOCIAL ICONS (dynamic index: socialIcon_0, socialIcon_1...)
          // -------------------------------------------------------------
          else if (file.fieldname.startsWith("socialIcon_")) {
            const index = parseInt(file.fieldname.split("_")[1]);

            if (!isNaN(index)) {
              // Delete old icon if exists
              if (existingCompany?.socialLinks?.[index]?.logoimage) {
                const publicId = extractPublicId(
                  existingCompany.socialLinks[index].logoimage
                );
                if (publicId) await cloudinary.uploader.destroy(publicId);
              }

              const upload = await cloudinary.uploader.upload(file.path, {
                folder: "company_social_icons",
              });

              if (!updatedSocialLinks[index]) updatedSocialLinks[index] = {};
              updatedSocialLinks[index].logoimage = upload.secure_url;
            }
          }

          safeUnlink(file.path);
        } catch (err) {
          console.log("❌ Upload Error:", err);
          safeUnlink(file.path);
        }
      }
    }

    data.socialLinks = updatedSocialLinks;

    // ==================================================================
    // REQUIRED FIELD VALIDATION
    // ==================================================================
    const requiredFields = [
      "name",
      "email",
      "phone",
      "address.street",
      "address.city",
      "address.state",
      "address.country",
      "address.postalCode",
    ];

    for (const field of requiredFields) {
      const parts = field.split(".");
      const value =
        parts.length > 1 ? data[parts[0]]?.[parts[1]] : data[parts[0]];

      if (!value || (typeof value === "string" && value.trim() === "")) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Filter directors
    if (data.directors?.length) {
      data.directors = data.directors.filter((d) => d.name?.trim());
    }

    // Filter social links
    if (data.socialLinks?.length) {
      data.socialLinks = data.socialLinks.filter(
        (s) => s.social || s.link || s.logoimage
      );
    }

    // ==================================================================
    // CREATE OR UPDATE SINGLE COMPANY
    // ==================================================================
    let company = await Company.findOne();

    if (company) {
      company = await Company.findByIdAndUpdate(company._id, data, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: "Company details updated successfully",
        company,
      });
    }

    const newCompany = await Company.create({
      ...data,
      createdBy: req.user?._id || null,
    });

    res.status(201).json({
      success: true,
      message: "Company created successfully",
      company: newCompany,
    });
  } catch (error) {
    console.error("❌ Company create/update error:", error);

    if (req.files) {
      req.files.forEach((f) => safeUnlink(f.path));
    }

    res.status(500).json({
      success: false,
      message: "Failed to create or update company",
      error: error.message,
    });
  }
};

// ======================================================================
// GET LIST
// ======================================================================
export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, companies });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
      error: error.message,
    });
  }
};

// ======================================================================
// GET ONE
// ======================================================================
export const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company)
      return res.status(404).json({ success: false, message: "Company not found" });

    res.status(200).json({ success: true, company });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch company",
      error: error.message,
    });
  }
};

// ======================================================================
// DELETE COMPANY + DELETE IMAGES FROM CLOUDINARY
// ======================================================================
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company)
      return res.status(404).json({ success: false, message: "Company not found" });

    // Delete logo
    if (company.logo) {
      const publicId = extractPublicId(company.logo);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    // Delete social icon images
    if (company.socialLinks?.length) {
      for (const s of company.socialLinks) {
        if (s.logoimage) {
          const publicId = extractPublicId(s.logoimage);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }
    }

    await company.deleteOne();

    res.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete company",
      error: error.message,
    });
  }
};
