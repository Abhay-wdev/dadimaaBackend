import express from "express";
import upload from "../config/multer.js";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import {
  deleteCategoryCard,
  updateCategoryCard,
  getCategoryCardById,
  getCategoriesCards,
  createCategoryCard
} from "../controllers/category.js";

const router = express.Router();

// Public read
router.get("/", getCategoriesCards);
router.get("/:id", getCategoryCardById);

// Protected write
router.post("/", protect, allowRoles("admin", "seller", "manager"), upload.single("image"), createCategoryCard);
router.put("/:id", protect, allowRoles("admin", "seller", "manager"), upload.single("image"), updateCategoryCard);
router.delete("/:id",protect, allowRoles("admin", "seller", "manager"), deleteCategoryCard);

export default router;
