import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// CẤU HÌNH BAO PHỦ TẤT CẢ CÁC TÊN MIỀN BẠN CÓ THỂ DÙNG (Ngăn cách bằng dấu phẩy)
// Cực kỳ quan trọng: Không được để dấu "/" ở cuối các đường link
const ADMIN_DOMAIN = process.env.ADMIN_CORS || "https://api.teementpod.us,https://admin.teementpod.us,https://teementpod.us";
const STORE_DOMAIN = process.env.STORE_CORS || "https://teementpod.us,https://api.teementpod.us";

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: STORE_DOMAIN,
      adminCors: ADMIN_DOMAIN,
      authCors: ADMIN_DOMAIN,
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
