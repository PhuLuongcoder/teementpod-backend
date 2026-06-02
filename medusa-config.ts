import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // CẤU HÌNH TỔNG: Cho phép tất cả các nguồn truy cập
      storeCors: "*", 
      adminCors: "*",
      authCors: "*",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    disable: false, // <--- ĐÂY LÀ "CHÌA KHÓA" ĐỂ ÉP SERVER BUILD GIAO DIỆN ADMIN
    backendUrl: "https://api.teementpod.us",
  },
  // BẮT ĐẦU THÊM ĐOẠN NÀY ĐỂ ĐĂNG KÝ MODULE SHOP
  modules: {
    sellerModuleService: {
      resolve: "./src/modules/seller", // Đảm bảo đường dẫn này trỏ đúng tới thư mục code module của bạn
    },
  },
  // KẾT THÚC PHẦN THÊM MỚI
})
