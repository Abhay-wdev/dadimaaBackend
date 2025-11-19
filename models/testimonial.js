import mongoose from "mongoose";

const TestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 1000 }, // ✅ renamed from text → message
    image: { type: String, required: true, trim: true }, // Cloudinary URL
    link: { type: String, trim: true, default: "" },     // optional URL
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Optional text index for better search support
TestimonialSchema.index({ name: "text", title: "text", message: "text" });

export default mongoose.model("Testimonial", TestimonialSchema);
