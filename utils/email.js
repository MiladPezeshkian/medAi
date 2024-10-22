const nodemailer = require("nodemailer");
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT), // تبدیل به عدد
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: process.env.EMAIL_SECURE === "true",
  });

  const mailOptions = {
    from: "LoneWalKerShop <lonewalkershop@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error.message); // لاگ کردن پیام خطا
    console.error("Full error details:", error); // لاگ کردن جزئیات کامل خطا
    throw new Error("Error sending email");
  }
};
module.exports = sendEmail;
