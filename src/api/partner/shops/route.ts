import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve("query");
    
    // Lấy danh sách toàn bộ Cửa hàng (Shop)
    const { data: shops } = await query.graph({
      entity: "shop",
      fields: [
        "id", 
        "name", 
        "is_active", 
        "logo_url",  
        "tax_id"    
      ], 
    });

    res.json({ status: "success", shops });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }

}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    const { name } = req.body as { name: string };

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Tên cửa hàng không được để trống!" });
    }

    // 1. TÌM SELLER ĐANG CÓ TRONG HỆ THỐNG
    const query = req.scope.resolve("query");
    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: ["id"],
    });

    let validSellerId = "";

    if (!sellers || sellers.length === 0) {
      console.log("Hệ thống chưa có Seller nào. Đang tự động tạo Seller mặc định...");
      
      // Tự động tạo 1 tài khoản Seller mặc định để làm "chủ" của các cửa hàng
      const newSellers = await sellerService.createSellers([
        { 
          // Nếu bảng Seller của bạn có yêu cầu trường nào khác (như email), 
          // bạn có thể thêm vào đây. Tạm thời mình để rỗng hoặc thêm name.
          name: "My Default Seller" 
        }
      ]);
      
      validSellerId = newSellers[0].id;
      console.log("Đã tạo xong Seller mặc định với ID:", validSellerId);
    } else {
      // Nếu đã có sẵn Seller trong DB thì lấy người đầu tiên
      validSellerId = sellers[0].id;
    }

    // 2. TẠO CỬA HÀNG (SHOP) VÀ GẮN VÀO SELLER HỢP LỆ
    const newShops = await sellerService.createShops([
      { 
        name: name.trim(),
        seller_id: validSellerId 
      }
    ]);

    res.json({ status: "success", shop: newShops[0] });
  } catch (error: any) {
    console.error("LỖI TẠO SHOP:", error.message);
    res.status(500).json({ error: error.message });
  }
}
