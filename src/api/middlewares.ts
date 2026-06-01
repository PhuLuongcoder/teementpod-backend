import { defineMiddlewares } from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/partner/*",
      middlewares: [
        (req, res, next) => {
          res.setHeader("Access-Control-Allow-Origin", "https://seller.teementpod.us");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
          
          // ĐÃ BỔ SUNG x-publishable-api-key VÀ x-medusa-access-token VÀO ĐÂY
          res.setHeader(
            "Access-Control-Allow-Headers", 
            "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publishable-api-key, x-medusa-access-token"
          );
          
          if (req.method === "OPTIONS") {
            return res.status(200).end();
          }
          next();
        }
      ],
    },
    {
      matcher: "/admin/*",
      middlewares: [
        (req, res, next) => {
          res.setHeader("Access-Control-Allow-Origin", "https://api.teementpod.us");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE, PATCH");
          
          // ĐÃ BỔ SUNG TƯƠNG TỰ CHO CỔNG ADMIN
          res.setHeader(
            "Access-Control-Allow-Headers", 
            "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publishable-api-key, x-medusa-access-token"
          );
          
          if (req.method === "OPTIONS") {
            return res.status(200).end();
          }
          next();
        }
      ],
    }
  ],
});
