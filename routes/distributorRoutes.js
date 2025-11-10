import express from "express";
import {
  createDistributor,
  getAllDistributors,
  deleteDistributor,
} from "../controllers/distributorController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";
const router = express.Router();

// Public route to submit form
router.post("/", createDistributor);

// Admin routes
router.get("/",protect, allowRoles("admin", "seller", "manager"), getAllDistributors);
router.delete("/:id",protect, allowRoles("admin", "seller", "manager"), deleteDistributor);

export default router;
