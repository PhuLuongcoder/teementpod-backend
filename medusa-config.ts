import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
<<<<<<< HEAD
      // Dùng cú pháp dấu hai chấm (:) và process.env để đọc dữ liệu
      storeCors: process.env.STORE_CORS || "https://teementpod.us,https://www.teementpod.us,https://seller.teementpod.us",
      adminCors: process.env.ADMIN_CORS || "https://api.teementpod.us,https://seller.teementpod.us",
      authCors: process.env.AUTH_CORS || "https://api.teementpod.us,https://teementpod.us,https://www.teementpod.us,https://seller.teementpod.us",
=======
      // CẤU HÌNH TỔNG: Cho phép tất cả các nguồn truy cập
      storeCors: "*", 
      adminCors: "*",
      authCors: "*",
>>>>>>> 585001a5bb1766d2ecdfae70ec729495157598c3
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
<<<<<<< HEAD
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true" || false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "https://api.teementpod.us",
    path: "/app",
=======
    backendUrl: "https://api.teementpod.us",
>>>>>>> 585001a5bb1766d2ecdfae70ec729495157598c3
  },
  // ... phần còn lại giữ nguyên
})
