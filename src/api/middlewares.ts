import { defineMiddlewares } from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/partner/*",
      // Không dùng thư viện cors nữa, tự tay viết middleware
      middlewares: [
        (req, res, next) => {
          // 1. Ép cứng tên miền Seller vào Header
          res.setHeader("Access-Control-Allow-Origin", "https://seller.teementpod.us");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
          res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
          
          // 2. Bắt chết lệnh thăm dò (OPTIONS) và trả về thành công (200) ngay lập tức
          if (req.method === "OPTIONS") {
            return res.status(200).end();
          }
          
          // 3. Nếu là request bình thường (GET, POST), cho đi tiếp
          next();
        }
      ],
    },
    {
      matcher: "/admin/*",
      middlewares: [
        (req, res, next) => {
          res.setHeader("Access-Control-Allow-Origin", "https://api.teementpod.us"); // hoặc trang admin của bạn
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
          res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
          
          if (req.method === "OPTIONS") {
            return res.status(200).end();
          }
          next();
        }
      ],
    }
  ],
});
