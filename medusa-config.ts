import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// THAY URL NÀY BẰNG ĐÚNG TÊN MIỀN BẠN ĐANG DÙNG ĐỂ VÀO ADMIN (Không có dấu / ở cuối)
const ADMIN_DOMAIN = process.env.ADMIN_CORS || "https://admin.teementpod.us" 
const STORE_DOMAIN = process.env.STORE_CORS || "https://teementpod.us" // Tên miền cửa hàng bán hàng

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // CẤU HÌNH CORS CHUẨN ĐỂ KHÔNG BỊ LỖI COOKIE/401
      storeCors: STORE_DOMAIN,
      adminCors: ADMIN_DOMAIN,
      authCors: ADMIN_DOMAIN, // authCors thường đi chung tên miền với admin
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    disable: false, 
    backendUrl: "https://api.teementpod.us",
  },
  modules: {
    sellerModuleService: {
      resolve: "./src/modules/seller",
    },
  },
})
