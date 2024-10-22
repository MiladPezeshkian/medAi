const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a product name"],
      trim: true,
      maxlength: [100, "Product name must be less than 100 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please provide a price"],
    },
    category: {
      type: String,
      enum: ["men's clothing", "women's clothing", "jewelery", "electronics"],
      lowercase: true,
      required: [true, "Please provide a category"],
    },
    description: {
      type: String,
      required: [true, "Please provide a description"],
    },
    image: {
      type: String,
      required: [true, "Please upload an image for the product"],
    },
    count: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        name: {
          type: String,
        },
        review: {
          type: String,
          required: [true, "Please write your review"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        rating: {
          type: Number,
          required: [true, "Please provide a rating for the review"],
        },
      },
    ],
  },
  { timestamps: true }
);

// متد محاسبه میانگین امتیاز و تعداد امتیازات
productSchema.methods.calcAverageRatings = function () {
  const totalRatings = this.reviews.reduce((acc, cur) => acc + cur.rating, 0);
  this.count = this.reviews.length;
  this.rating = this.count === 0 ? 4.5 : totalRatings / this.count;

  // ذخیره تغییرات در محصول
  return this.save();
};

// متد اضافه کردن نظر جدید و به‌روزرسانی میانگین
productSchema.methods.addReview = async function (review) {
  this.reviews.push(review);

  // به‌روزرسانی میانگین امتیاز
  await this.calcAverageRatings();
};

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
