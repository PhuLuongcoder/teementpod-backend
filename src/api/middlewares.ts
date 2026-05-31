import { defineMiddlewares } from "@medusajs/framework/http";
import cors from "cors";

export default defineMiddlewares({
  routes: [
    {
      // 1. Áp dụng CORS cho cổng Seller Dashboard (3001)
      matcher: "/partner/*",
      middlewares: [
        cors({
          origin: "http://localhost:3001", 
          credentials: true, // Đồng ý nhận Cookie/Phiên đăng nhập
        }),
      ],
    },
    {
      // 2. Áp dụng CORS cho cổng Admin Dashboard (3000)
      matcher: "/admin/*",
      middlewares: [
        cors({
          origin: "http://localhost:3000",
          credentials: true,
        }),
      ],
    }
  ],
});