import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // 1. LẤY ID NGƯỜI DÙNG TỪ TOKEN (Xác thực)
    const currentSellerId = (req as any).user?.seller_id || (req as any).user?.id || (req as any).auth_context?.actor_id; 

    if (!currentSellerId) {
      return res.status(401).json({ error: "Chưa đăng nhập hoặc phiên đã hết hạn!" });
    }

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

    // 1. LẤY ID NGƯỜI DÙNG TỪ TOKEN
    const currentSellerId = (req as any).user?.seller_id || (req as any).user?.id || (req as any).auth_context?.actor_id; 

    if (!currentSellerId) {
      return res.status(401).json({ error: "Chưa đăng nhập! Không thể tạo cửa hàng." });
    }

    // (Đã xóa bỏ đoạn code lỗi tự động gán cho sellers[0] của bạn)

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
