import express from "express";
import upload from "../config/multer.js";
import {
  createVideoProduct,
  getAllVideoProducts,
  getVideoProductById,
  updateVideoProduct,
  deleteVideoProduct,
} from "../controllers/videoProductController.js";
import { protect } from "../middlewares/authMiddleware.js"; // JWT middleware
 
import { allowRoles } from "../middlewares/roleMiddleware.js";
const router = express.Router();

router.post("/",protect,allowRoles("admin", "seller", "manager"), upload.single("image"), createVideoProduct);
router.get("/", getAllVideoProducts);
router.get("/:id", getVideoProductById);
router.put("/:id",protect,allowRoles("admin", "seller", "manager"), upload.single("image"), updateVideoProduct);
router.delete("/:id",protect,allowRoles("admin", "seller", "manager"), deleteVideoProduct);

export default router;
