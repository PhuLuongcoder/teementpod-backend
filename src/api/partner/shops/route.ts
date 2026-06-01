import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
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

    const query = req.scope.resolve("query");
    
    // 2. LỌC CỬA HÀNG THEO ĐÚNG SELLER_ID ĐANG ĐĂNG NHẬP
    const { data: shops } = await query.graph({
      entity: "shop",
      fields: [
        "id", 
        "name", 
        "is_active", 
        "logo_url",  
        "tax_id",
        "seller_id" // Thêm trường này trả về để dễ kiểm tra
      ], 
      filters: {
        seller_id: currentSellerId // <--- BỘ LỌC CHỐT CHẶN BẢO MẬT
      }
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
