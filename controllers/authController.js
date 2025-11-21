// controllers/authController.js
import UserModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import emailApi from "../config/brevo.js"; // ✅ Import configured Brevo client
import { generateToken } from "../config/jwt.js";
dotenv.config();

let otpStore = {}; // Temporary in-memory OTP store

// ================================
// SEND REGISTRATION OTP
// ================================
export const sendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required" });

    const existingUser = await UserModel.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[email] = otp;

    const emailData = {
      sender: { email: process.env.BREVO_EMAIL, name: process.env.APP_NAME },
      to: [{ email }],
      subject: "Your Registration OTP Code",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #eee;border-radius:8px;max-width:500px;margin:auto;">
          <h2 style="color:#4a90e2;">Welcome to  dadi maake laddu!</h2>
          <p>Your One-Time Password (OTP) for registration is:</p>
          <h1 style="color:#4a90e2;letter-spacing:6px;">${otp}</h1>
          <p>This OTP will expire in <b>5 minutes</b>.</p>
          <br/>
          <p style="font-size:13px;color:#666;">– The Support Team</p>
        </div>
      `,
    };

    await emailApi.sendTransacEmail(emailData);
    console.log(`✅ OTP sent successfully to ${email}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully! Please check your email.",
      email,
    });
  } catch (error) {
    console.error("❌ Error sending registration OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again later.",
      error: error.message,
    });
  }
};

// ================================
// VERIFY OTP & REGISTER USER
// ================================
 

export const verifyOTPAndRegister = async (req, res) => {
  try {
    const { name, email, password, phone, otp } = req.body;

    // 1️⃣ Validate OTP existence
    if (!otpStore[email])
      return res.status(400).json({ success: false, message: "OTP not found or expired" });

    // 2️⃣ Validate OTP correctness
    if (otpStore[email] !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    // 3️⃣ Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please log in.",
      });
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create user
    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "customer",
      emailVerified: true,
    });

    // 6️⃣ Generate JWT token
    const token = generateToken(user._id);

    // 7️⃣ Cleanup OTP
    delete otpStore[email];

    // 8️⃣ Send success response
    return res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying OTP and registering:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register user.",
      error: error.message,
    });
  }
};


// ================================
// FORGOT PASSWORD – SEND OTP
// ================================
export const sendForgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[email] = otp;

    const emailData = {
      sender: { email: process.env.BREVO_EMAIL, name: process.env.APP_NAME },
      to: [{ email }],
      subject: "Password Reset OTP",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #eee;border-radius:8px;max-width:500px;margin:auto;">
          <h2>Password Reset Request</h2>
          <p>Your OTP for resetting your password is:</p>
          <h1 style="color:#4a90e2;">${otp}</h1>
          <p>This OTP will expire in <b>5 minutes</b>.</p>
          <br/>
          <p style="font-size:13px;color:#666;">– The Support Team</p>
        </div>
      `,
    };

    await emailApi.sendTransacEmail(emailData);
    console.log(`✅ Forgot password OTP sent to ${email}`);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully to your email.",
      email,
    });
  } catch (error) {
    console.error("❌ Error sending forgot password OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send password reset OTP.",
      error: error.message,
    });
  }
};

// ================================
// RESET PASSWORD
// ================================
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!otpStore[email])
      return res.status(400).json({ success: false, message: "OTP not found or expired" });

    if (otpStore[email] !== otp)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.findOneAndUpdate({ email }, { password: hashedPassword });

    delete otpStore[email];
    console.log(`✅ Password reset successfully for ${email}`);

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully!",
    });
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password. Please try again later.",
      error: error.message,
    });
  }
};
