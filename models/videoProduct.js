import mongoose from "mongoose";

const videoProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    youtubeUrl: {
      type: String,
      required: true,
    },
    productUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const VideoProduct = mongoose.model("VideoProduct", videoProductSchema);
export default VideoProduct;
