import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    logo: {
      type: String, // Cloudinary or image URL
      default: "",
    },
    email: {
      type: String,
      required: [true, "Company email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    phone: {
      type: String,
      required: [true, "Company phone number is required"],
      trim: true,
    },
    address: {
      street: { 
        type: String, 
        required: [true, "Street address is required"],
        trim: true 
      },
      city: { 
        type: String, 
        required: [true, "City is required"],
        trim: true 
      },
      state: { 
        type: String, 
        required: [true, "State is required"],
        trim: true 
      },
      country: { 
        type: String, 
        required: [true, "Country is required"],
        trim: true 
      },
      postalCode: { 
        type: String, 
        required: [true, "Postal code is required"],
        trim: true 
      },
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    registrationYear: {
      type: Number,
      min: [1800, "Registration year must be after 1800"],
      max: [new Date().getFullYear(), "Registration year cannot be in the future"],
    },
    directors: [
      {
        name: { 
          type: String, 
          required: [true, "Director name is required"],
          trim: true 
        },
        designation: { 
          type: String, 
          default: "Director",
          trim: true 
        },
      },
    ],
    businessType: {
      type: String,
      enum: {
        values: [
          "Private Limited",
          "Public Limited",
          "LLP",
          "Partnership",
          "Proprietorship",
          "Other",
          "" // Allow empty string as well
        ],
        message: "{VALUE} is not a valid business type",
      },
      default: "Other",
    },
    website: {
      type: String,
      trim: true,
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "Please provide a valid website URL",
      ],
    },
    socialLinks: [
      {
        logoimage: { 
          type: String,
          trim: true 
        },
        social: { 
          type: String,
          trim: true 
        },
        link: { 
          type: String,
          trim: true 
        },
      },
    ],
    invoiceNote: {
      type: String,
      default: "Thank you for your business!",
      trim: true,
    },
    deliveryCharge: {
      type: Number,
      required: [true, "Delivery charge is required"],
      min: [0, "Delivery charge cannot be negative"],
      default: 0,
      validate: {
        validator: function(value) {
          return Number.isFinite(value);
        },
        message: "Delivery charge must be a valid number"
      }
    },
    freeDeliveryUpto: {
      type: Number,
      required: [true, "Free delivery threshold is required"],
      min: [0, "Free delivery threshold cannot be negative"],
      default: 0,
      validate: {
        validator: function(value) {
          return Number.isFinite(value);
        },
        message: "Free delivery threshold must be a valid number"
      }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ✅ Index for faster queries
companySchema.index({ name: 1 });
companySchema.index({ email: 1 });

// ✅ Pre-save middleware to clean up empty values
companySchema.pre('save', function(next) {
  // Remove empty directors
  if (this.directors && Array.isArray(this.directors)) {
    this.directors = this.directors.filter(dir => dir.name && dir.name.trim() !== '');
  }
  
  // Remove empty social links
  if (this.socialLinks && Array.isArray(this.socialLinks)) {
    this.socialLinks = this.socialLinks.filter(
      link => link.social || link.link || link.logoimage
    );
  }
  
  // Ensure deliveryCharge is a valid number
  if (this.deliveryCharge !== undefined) {
    // Convert to number if it's a string
    if (typeof this.deliveryCharge === 'string') {
      this.deliveryCharge = parseFloat(this.deliveryCharge);
    }
    
    // If it's NaN or negative, set to default
    if (isNaN(this.deliveryCharge) || this.deliveryCharge < 0) {
      this.deliveryCharge = 0;
    }
  } else {
    // Set default if not provided
    this.deliveryCharge = 0;
  }
  
  // Ensure freeDeliveryUpto is a valid number
  if (this.freeDeliveryUpto !== undefined) {
    // Convert to number if it's a string
    if (typeof this.freeDeliveryUpto === 'string') {
      this.freeDeliveryUpto = parseFloat(this.freeDeliveryUpto);
    }
    
    // If it's NaN or negative, set to default
    if (isNaN(this.freeDeliveryUpto) || this.freeDeliveryUpto < 0) {
      this.freeDeliveryUpto = 0;
    }
  } else {
    // Set default if not provided
    this.freeDeliveryUpto = 0;
  }
  
  next();
});

const Company = mongoose.model("Company", companySchema);
export default Company;