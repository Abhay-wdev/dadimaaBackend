import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";       // <-- import category routes
import subCategoryRoutes from "./routes/subCategoryRoutes.js"; // <-- import subcategory routes
import couponRoutes from "./routes/couponRoutes.js";
import  userShippingAddress  from "./routes/userShippingAddressRoutes.js"; 
import  userHomeAddress  from "./routes/userHomeAddressRoutes.js"; 
import orderItemRoutes from "./routes/orderItemRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import orderHistoryRoutes from "./routes/orderHistoryRoutes.js";
import paymentAttemptRoutes from "./routes/paymentAttemptRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import auth from "./routes/auth.js";
import heroImageRoutes from "./routes/heroImageRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import videoProductRoutes from "./routes/videoProductRoutes.js";
import category from "./routes/category.js";
import testimonialsRouter from "./routes/testimonialsRoutes.js";
import distributorRoutes from "./routes/distributorRoutes.js";
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect Database
connectDB();

// Routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);           // <-- add categories
app.use("/api/subcategories", subCategoryRoutes);     // <-- add subcategories
app.use("/api/user", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/shippingaddress",userShippingAddress); 
app.use("/api/homeaddress",userHomeAddress); 
app.use("/api/order-item", orderItemRoutes);
app.use("/api/return", returnRoutes);
app.use("/api/order-history", orderHistoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment-attempt", paymentAttemptRoutes);
app.use("/api/hero", heroImageRoutes);
app.use("/api/auth", auth);
app.use("/api/blogs", blogRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/videoproducts", videoProductRoutes);
app.use("/api/categoryCards", category);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/distributors", distributorRoutes);
app.get("/", (req, res) => res.send("API is running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
