import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
     
    name: { type: String, required: true, trim: true },
    image: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: {
  type: String,
  required: true,
  match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
  trim: true,
},
    role: {
      type: String,
      enum: ["customer", "admin", "seller", "manager"],
      default: "customer",
    },
    shippingAddress: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserShippingAddress" }],
    homeAddress: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserHomeAddress" }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    cart: [{ type: mongoose.Schema.Types.ObjectId, ref: "Cart" }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
