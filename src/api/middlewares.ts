import { defineMiddlewares } from "@medusajs/framework/http";
import cors from "cors";

// Hàm biến chuỗi trong .env thành mảng (Array) chuẩn
const parseCorsOrigins = (envVar: string | undefined, fallback: string) => {
  if (!envVar) return [fallback]; // Đảm bảo luôn trả về mảng
  return envVar.split(",").map(url => url.trim());
};

export default defineMiddlewares({
  routes: [
    {
      matcher: "/partner/*",
      method: "ALL", // BẮT BUỘC: Đảm bảo xử lý cả request thăm dò (OPTIONS)
      middlewares: [
        cors({
          origin: parseCorsOrigins(process.env.STORE_CORS, "http://localhost:3001"), 
          credentials: true, 
        }),
      ],
    },
    {
      matcher: "/admin/*",
      method: "ALL", // BẮT BUỘC
      middlewares: [
        cors({
          origin: parseCorsOrigins(process.env.ADMIN_CORS, "http://localhost:3000"),
          credentials: true,
        }),
      ],
    }
  ],
});
