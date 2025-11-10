import mongoose from "mongoose";

const distributorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    association: { type: String, required: true, trim: true },
    source: { type: String, trim: true },
    comments: { type: String, trim: true },
    agree: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Distributor = mongoose.model("Distributor", distributorSchema);
export default Distributor;
