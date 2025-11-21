import Company from "../models/companyModal.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import {
  deleteCloudinaryImage,
} from "../config/cloudinaryHelper.js";

export const createOrUpdateCompany = async (req, res) => {
  try {
    let data = { ...req.body };

    // Parse JSON fields
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
    
    // Handle deliveryCharge field
    if (data.deliveryCharge !== undefined) {
      // Convert to number if it's a string
      if (typeof data.deliveryCharge === 'string') {
        data.deliveryCharge = parseFloat(data.deliveryCharge);
      }
      
      // Validate it's a number and non-negative
      if (isNaN(data.deliveryCharge) || data.deliveryCharge < 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery charge must be a non-negative number",
        });
      }
    } else {
      // Set default value if not provided
      data.deliveryCharge = 0;
    }
    
    // Handle freeDeliveryUpto field
    if (data.freeDeliveryUpto !== undefined) {
      // Convert to number if it's a string
      if (typeof data.freeDeliveryUpto === 'string') {
        data.freeDeliveryUpto = parseFloat(data.freeDeliveryUpto);
      }
      
      // Validate it's a number and non-negative
      if (isNaN(data.freeDeliveryUpto) || data.freeDeliveryUpto < 0) {
        return res.status(400).json({
          success: false,
          message: "Free delivery threshold must be a non-negative number",
        });
      }
    } else {
      // Set default value if not provided
      data.freeDeliveryUpto = 0;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Load existing company for reference (for image delete)
    let existingCompany = await Company.findOne();

    // Clone social links to modify safely
    const updatedSocialLinks = [...(data.socialLinks || [])];

    // ==========================================================
    // 🔥 HANDLE FILE UPLOADS + AUTO DELETE OLD CLOUDINARY IMAGES
    // ==========================================================
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // ----------------------------------------------------
          // 1️⃣ Company Logo Update (Replace old logo)
          // ----------------------------------------------------
          if (file.fieldname === "logo") {
            if (existingCompany?.logo) {
              await deleteCloudinaryImage(existingCompany.logo);
            }

            const upload = await cloudinary.uploader.upload(file.path, {
              folder: "company_logos",
            });

            data.logo = upload.secure_url;
          }

          // ----------------------------------------------------
          // 2️⃣ Social Icons dynamic replacement: socialIcon_0, socialIcon_1 ...
          // ----------------------------------------------------
          else if (file.fieldname.startsWith("socialIcon_")) {
            const index = parseInt(file.fieldname.split("_")[1]);

            if (!isNaN(index)) {
              const oldIcon = existingCompany?.socialLinks?.[index]?.logoimage;

              if (oldIcon) {
                await deleteCloudinaryImage(oldIcon);
              }

              const upload = await cloudinary.uploader.upload(file.path, {
                folder: "company_social_icons",
              });

              if (!updatedSocialLinks[index]) updatedSocialLinks[index] = {};
              updatedSocialLinks[index].logoimage = upload.secure_url;
            }
          }

          // Delete temporary upload file
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        } catch (err) {
          console.error("❌ Upload error:", err);

          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
    }

    data.socialLinks = updatedSocialLinks;

    // ==========================================================
    // REQUIRED FIELD VALIDATION
    // ==========================================================
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

    // Directors validation
    if (data.directors && Array.isArray(data.directors)) {
      data.directors = data.directors.filter((d) => d.name?.trim());
    }

    // Social links validation
    if (data.socialLinks && Array.isArray(data.socialLinks)) {
      data.socialLinks = data.socialLinks.filter(
        (s) => s.social || s.link || s.logoimage
      );
    }

    // ==========================================================
    // CREATE OR UPDATE COMPANY IN DB
    // ==========================================================
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

    // Cleanup temp files on error
    if (req.files) {
      req.files.forEach((file) => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create or update company",
      error: error.message,
    });
  }
};

// ==================================================
// GET ALL COMPANIES
// ==================================================
export const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, companies });
  } catch (error) {
    console.error("❌ Fetch companies error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch companies",
      error: error.message,
    });
  }
};

// ==================================================
// GET SINGLE COMPANY
// ==================================================
export const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.status(200).json({ success: true, company });
  } catch (error) {
    console.error("❌ Fetch company error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company",
      error: error.message,
    });
  }
};

// ==================================================
// DELETE COMPANY
// ==================================================
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: "Company not found" 
      });
    }

    // ✅ Optional: Delete associated images from Cloudinary
    if (company.logo) {
      try {
        const publicId = company.logo.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error("Error deleting logo:", err);
      }
    }

    if (company.socialLinks && company.socialLinks.length > 0) {
      for (const link of company.socialLinks) {
        if (link.logoimage) {
          try {
            const publicId = link.logoimage.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.error("Error deleting social icon:", err);
          }
        }
      }
    }

    await company.deleteOne();

    res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete company error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete company",
      error: error.message,
    });
  }
};

// ==================================================
// UPDATE DELIVERY CHARGE
// ==================================================
export const updateDeliveryCharge = async (req, res) => {
  try {
    const { deliveryCharge } = req.body;
    
    // Validate delivery charge
    if (deliveryCharge === undefined) {
      return res.status(400).json({
        success: false,
        message: "Delivery charge is required",
      });
    }
    
    // Convert to number if it's a string
    let charge = deliveryCharge;
    if (typeof charge === 'string') {
      charge = parseFloat(charge);
    }
    
    // Validate it's a number and non-negative
    if (isNaN(charge) || charge < 0) {
      return res.status(400).json({
        success: false,
        message: "Delivery charge must be a non-negative number",
      });
    }
    
    // Find and update company
    const company = await Company.findOne();
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }
    
    company.deliveryCharge = charge;
    await company.save();
    
    res.status(200).json({
      success: true,
      message: "Delivery charge updated successfully",
      deliveryCharge: company.deliveryCharge,
    });
  } catch (error) {
    console.error("❌ Update delivery charge error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update delivery charge",
      error: error.message,
    });
  }
};

// ==================================================
// UPDATE FREE DELIVERY THRESHOLD
// ==================================================
export const updateFreeDeliveryThreshold = async (req, res) => {
  try {
    const { freeDeliveryUpto } = req.body;
    
    // Validate free delivery threshold
    if (freeDeliveryUpto === undefined) {
      return res.status(400).json({
        success: false,
        message: "Free delivery threshold is required",
      });
    }
    
    // Convert to number if it's a string
    let threshold = freeDeliveryUpto;
    if (typeof threshold === 'string') {
      threshold = parseFloat(threshold);
    }
    
    // Validate it's a number and non-negative
    if (isNaN(threshold) || threshold < 0) {
      return res.status(400).json({
        success: false,
        message: "Free delivery threshold must be a non-negative number",
      });
    }
    
    // Find and update company
    const company = await Company.findOne();
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }
    
    company.freeDeliveryUpto = threshold;
    await company.save();
    
    res.status(200).json({
      success: true,
      message: "Free delivery threshold updated successfully",
      freeDeliveryUpto: company.freeDeliveryUpto,
    });
  } catch (error) {
    console.error("❌ Update free delivery threshold error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update free delivery threshold",
      error: error.message,
    });
  }
};