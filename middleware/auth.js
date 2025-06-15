const jwt = require("jsonwebtoken");
const User = require("../models/UserModel");

exports.protect = async (req, res, next) => {
  let token;

  // گرفتن توکن از هدر Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password"); // ذخیره اطلاعات کاربر در req.user
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};
