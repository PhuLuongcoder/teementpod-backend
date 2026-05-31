import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // Dùng cú pháp dấu hai chấm (:) và process.env để đọc dữ liệu
      storeCors: process.env.STORE_CORS || "https://teementpod.us,https://www.teementpod.us,https://seller.teementpod.us",
      adminCors: process.env.ADMIN_CORS || "https://api.teementpod.us,https://seller.teementpod.us",
      authCors: process.env.AUTH_CORS || "https://api.teementpod.us,https://teementpod.us,https://www.teementpod.us,https://seller.teementpod.us",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true" || false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "https://api.teementpod.us",
    path: "/app",
  },
  modules: {
    sellerModuleService: {
      resolve: "./src/modules/seller",
    }
  }
})