import { defineMiddlewares } from "@medusajs/framework/http";
import cors from "cors";

export default defineMiddlewares({
  routes: [
    {
      // 1. Dành cho cổng Seller
      matcher: "/partner/*",
      // Bỏ luôn chữ method để nó tự động bắt mọi request, bao gồm cả OPTIONS
      middlewares: [
        cors({
          origin: [
            "https://seller.teementpod.us",
            "https://teementpod.us",
            "https://www.teementpod.us",
            "http://localhost:3001"
          ], 
          credentials: true, 
        }),
      ],
    },
    {
      // 2. Dành cho cổng Admin
      matcher: "/admin/*",
      middlewares: [
        cors({
          origin: [
            "https://api.teementpod.us",
            "https://seller.teementpod.us",
            "http://localhost:3000"
          ],
          credentials: true,
        }),
      ],
    }
  ],
});
