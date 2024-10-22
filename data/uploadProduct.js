const fs = require("fs");
const path = require("path");
const ProductModel = require("../models/ProductModel");
exports.Upload = function () {
  // خواندن فایل جیسون
  fs.readFile(
    path.join(__dirname, "./Shop.products.json"),
    "utf8",
    (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        return;
      }

      // تبدیل داده‌ها به یک آرایه از اشیا
      const products = JSON.parse(data);
      console.log(products);
      // برای هر عنصر در آرایه، آن را به دیتابیس اضافه کن
      products.forEach(async (product) => {
        const newProduct = new ProductModel(product);
        try {
          await newProduct.save();
          console.log("Product added:", product.title);
        } catch (error) {
          console.error("Error saving product:", error);
        }
      });
    }
  );
};
