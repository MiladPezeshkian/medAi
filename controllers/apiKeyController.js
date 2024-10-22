const catchAsync = require("../utils/catchAsync");

exports.getApiKey = catchAsync(async (req, res, next) => {
  res.status(200).json({
    data: {
      apikey: process.env.API_KEY,
      sitekey: process.env.SITE_KEY,
    },
  });
});
