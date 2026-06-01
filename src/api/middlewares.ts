import { defineMiddlewares } from "@medusajs/framework/http";
import cors from "cors";

export default defineMiddlewares({
  routes: [
    {
      // Áp dụng CORS cho toàn bộ các API bắt đầu bằng /partner
      matcher: "/partner/*",
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
      // Áp dụng thêm cho các API tự custom khác của admin (nếu có)
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
