import Distributor from "../models/distributorModel.js";

// 📝 @desc   Submit new distributor request
// @route   POST /api/distributors
// @access  Public
export const createDistributor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      mobile,
      city,
      state,
      association,
      source,
      comments,
      agree,
    } = req.body;

    // Basic validation
    if (!firstName || !email || !mobile || !city || !state || !association) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    const newDistributor = await Distributor.create({
      firstName,
      lastName,
      email,
      mobile,
      city,
      state,
      association,
      source,
      comments,
      agree,
    });

    res.status(201).json({
      success: true,
      message: "Distributor request submitted successfully!",
      data: newDistributor,
    });
  } catch (error) {
    console.error("Error creating distributor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while submitting request.",
    });
  }
};

// 📋 @desc   Get all distributor requests (admin)
// @route   GET /api/distributors
// @access  Private/Admin
export const getAllDistributors = async (req, res) => {
  try {
    const distributors = await Distributor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: distributors });
  } catch (error) {
    console.error("Error fetching distributors:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching distributors.",
    });
  }
};

// ❌ @desc   Delete distributor entry (admin)
// @route   DELETE /api/distributors/:id
// @access  Private/Admin
export const deleteDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor)
      return res
        .status(404)
        .json({ success: false, message: "Distributor not found" });

    await distributor.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Distributor deleted successfully" });
  } catch (error) {
    console.error("Error deleting distributor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting distributor.",
    });
  }
};
