// utils/dateUtils.js
export const formatRelative = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000); // تفاوت بر حسب دقیقه

  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;

  // برای تاریخ‌های قدیمی‌تر
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
