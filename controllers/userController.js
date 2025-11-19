import mongoose from "mongoose";
import UserModel from "../models/userModel.js"; // adjust path
import bcrypt from "bcryptjs";
import cloudinary from "../config/cloudinary.js";


 
 
import { generateToken } from "../config/jwt.js"

// ===============================
// CREATE USER (REGISTER)
// ===============================
 

// ===============================
// GET ALL USERS WITH DEFAULT LIMIT
// ===============================
export const getAllUsers = async (req, res) => {
  try {
    // Default limit 50, skip 0
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const users = await UserModel.find()
      .select("-password") // exclude password
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // latest users first

    const totalUsers = await UserModel.countDocuments(); // total count for pagination

    res.status(200).json({
      success: true,
      totalUsers,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ===============================
// GET USER BY ID
// ===============================
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await UserModel.findById(userId).select("-password").populate("orders").populate("wishlist").populate("cart.product");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// UPDATE USER
// ===============================
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    let updateData = { ...req.body };

    // Upload image to Cloudinary if file is present
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "users",
      });
      updateData.image = result.secure_url; // Save Cloudinary URL
    }

    // Hash password if updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// DELETE USER
// ===============================

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user?._id; // assuming user info comes from auth middleware

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Ensure only admin can perform deletion
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    // Prevent admin from deleting their own account
    if (requesterId.toString() === userId) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot delete your own account." });
    }

    // Proceed with deletion
    const user = await UserModel.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// ADD TO CART
// ===============================
export const addToCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid user or product ID" });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if product already in cart
    const existingItemIndex = user.cart.findIndex(item => item.product.toString() === productId);
    if (existingItemIndex > -1) {
      user.cart[existingItemIndex].quantity += quantity || 1;
    } else {
      user.cart.push({ product: productId, quantity: quantity || 1 });
    }

    await user.save();
    res.status(200).json({ success: true, cart: user.cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// ADD TO WISHLIST
// ===============================
export const addToWishlist = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid user or product ID" });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image || "",
        addresses: user.addresses || [],
        shippingAddress: user.shippingAddress || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    // Ensure both values exist
    if (typeof isActive !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isActive must be a boolean" });
    }

    // Fetch user first
    const user = await UserModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Prevent an admin from deactivating themselves
    // Assuming req.user contains the logged-in user's info (set by middleware)
    if (req.user && req.user._id.toString() === userId && user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot deactivate your own admin account.",
      });
    }

    // Update active status
    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating status" });
  }
};

// ===============================
// LOGOUT USER
// ===============================
export const logoutUser = async (req, res) => {
  try {
    // If using JWT in localStorage, just instruct client to remove token
    res.status(200).json({
      success: true,
      message: "Logout successful. Please remove token from client-side.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};