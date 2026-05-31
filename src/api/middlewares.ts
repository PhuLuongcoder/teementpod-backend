import { defineMiddlewares } from "@medusajs/framework/http";
import cors from "cors";

// Hàm xử lý: Biến chuỗi cách nhau bằng dấu phẩy trong .env thành mảng (Array) cho thư viện CORS hiểu
const parseCorsOrigins = (envVar: string | undefined, fallback: string) => {
  if (!envVar) return fallback;
  return envVar.split(",").map(url => url.trim());
};

export default defineMiddlewares({
  routes: [
    {
      // 1. Áp dụng CORS cho cổng Seller Dashboard
      matcher: "/partner/*",
      middlewares: [
        cors({
          // Đọc từ biến STORE_CORS (đã chứa link seller.teementpod.us)
          origin: parseCorsOrigins(process.env.STORE_CORS, "http://localhost:3001"), 
          credentials: true, // Đồng ý nhận Cookie/Phiên đăng nhập
        }),
      ],
    },
    {
      // 2. Áp dụng CORS cho cổng Admin Dashboard
      matcher: "/admin/*",
      middlewares: [
        cors({
          // Đọc từ biến ADMIN_CORS
          origin: parseCorsOrigins(process.env.ADMIN_CORS, "http://localhost:3000"),
          credentials: true,
        }),
      ],
    }
  ],
});
