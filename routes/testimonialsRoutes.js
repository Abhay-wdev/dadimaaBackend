import express from "express";
import upload from "../config/multer.js";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
import {
  createTestimonial,
  getTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/testimonialsController.js";

const router = express.Router();

// Public routes
router.get("/", getTestimonials);
router.get("/:id", getTestimonialById);

// Protected CRUD with image upload
router.post(
  "/",
  protect,
  allowRoles("admin", "manager"),
  upload.single("image"),
  createTestimonial
);

router.put(
  "/:id",
  protect,
  allowRoles("admin", "manager"),
  upload.single("image"),
  updateTestimonial
);

router.delete(
  "/:id",
  protect,
  allowRoles("admin", "manager"),
  deleteTestimonial
);

export default router;
