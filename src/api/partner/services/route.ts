import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // --- KHỐI BẢO MẬT: TỰ GIẢI MÃ TOKEN ĐỂ BẢO VỆ API ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Chưa đăng nhập hoặc thiếu Token!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }
    // ----------------------------------------------------

    // Lấy toàn bộ danh sách dịch vụ của hệ thống (Không lọc theo seller_id vì đây là tài nguyên chung)
    const services = await sellerService.listServices({}, { order: { created_at: "ASC" } });
    
    res.json({ status: "success", services });
  } catch (error: any) {
    console.error("LỖI API DỊCH VỤ:", error);
    res.status(500).json({ error: error.message });
  }
}
