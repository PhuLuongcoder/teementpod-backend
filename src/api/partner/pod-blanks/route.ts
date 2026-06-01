import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sellerService = req.scope.resolve("sellerModuleService") as any;
    
    // 1. CHỐT CHẶN BẢO MẬT: Chỉ cho phép người đã đăng nhập xem kho phôi
    const currentSellerId = (req as any).user?.seller_id || (req as any).user?.id || (req as any).auth_context?.actor_id; 
    if (!currentSellerId) {
      return res.status(401).json({ error: "Chưa đăng nhập!" });
    }

    const { shop_id } = req.query as any;
    let markupFee = 0;

    // 2. KIỂM TRA SHOP_ID AN TOÀN (Lọc bỏ các chuỗi rác do Frontend vô tình gửi lên)
    if (shop_id && shop_id !== "null" && shop_id !== "undefined" && shop_id.trim() !== "") {
      const shops = await sellerService.listShops({ id: shop_id }, { relations: ["seller"] });
      if (shops.length > 0 && shops[0].seller) {
        markupFee = Number(shops[0].seller.markup_fee || 0);
      }
    }

    // 3. Lấy toàn bộ phôi hệ thống (Giữ nguyên luồng chuẩn của bạn, không có filter seller_id)
    const catalog = await sellerService.listPodBlanks({}, { order: { created_at: "DESC" } });

    // 4. TÍNH TOÁN GIÁ AN TOÀN (Đề phòng display_price trong DB bị rỗng)
    const adjustedCatalog = catalog.map((blank: any) => ({
      ...blank,
      // Ép kiểu về Number, nếu null/undefined thì gán = 0 trước khi cộng
      display_price: Number(blank.display_price || 0) + markupFee
    }));

    res.json({ status: "success", catalog: adjustedCatalog });
  } catch (error: any) {
    console.error("LỖI API KHO PHÔI:", error);
    res.status(500).json({ error: error.message });
  }
}
