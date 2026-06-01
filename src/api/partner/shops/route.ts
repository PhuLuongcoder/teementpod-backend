import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // 1. KIỂM TRA TOKEN BẢO MẬT
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

    // 2. LẤY DANH SÁCH SHOP BẰNG SERVICE THAY VÌ GRAPH
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // Tự động lọc ra đúng các cửa hàng của Seller này
    const shops = await sellerService.listShops({ 
      seller_id: currentSellerId 
    });

    res.json({ status: "success", shops });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService");
    const { name } = req.body as { name: string };

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Tên cửa hàng không được để trống!" });
    }

    // --- KHỐI BẢO MẬT MỚI (TỰ GIẢI MÃ TOKEN) ---
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
    // ------------------------------------------

    // 2. TẠO CỬA HÀNG VÀ GẮN ĐÚNG VÀO SELLER ĐANG ĐĂNG NHẬP
    const newShops = await sellerService.createShops([
      { 
        name: name.trim(),
        seller_id: currentSellerId // <--- Gán cho chính người đang gọi API
      }
    ]);

    res.json({ status: "success", shop: newShops[0] });
  } catch (error: any) {
    console.error("LỖI TẠO SHOP:", error.message);
    res.status(500).json({ error: error.message });
  }
}
