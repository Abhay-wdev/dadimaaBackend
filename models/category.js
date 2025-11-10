import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, required: true }, // Cloudinary secure_url
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    link: { type: String, required: true, trim: true } // e.g. /products/ground-spices
  },
  { timestamps: true }
);

const CategoryCards = mongoose.model("CategoryCards", categorySchema);
export default CategoryCards;
