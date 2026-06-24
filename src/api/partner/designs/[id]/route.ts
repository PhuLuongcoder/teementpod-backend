import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import jwt from "jsonwebtoken";

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    // =====================================================================
    // 1. KHỐI BẢO MẬT: TỰ GIẢI MÃ TOKEN (CHỐNG TRUY CẬP TRÁI PHÉP)
    // =====================================================================
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Truy cập bị từ chối: Vui lòng đăng nhập lại!" });
    }

    let currentSellerId = "";
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-key-teement") as any;
      currentSellerId = decoded.seller_id;
    } catch (err) {
      return res.status(401).json({ error: "Token hết hạn hoặc không hợp lệ!" });
    }

    // =====================================================================
    // 2. KHỐI BẢO MẬT: KIỂM TRA QUYỀN SỞ HỮU THIẾT KẾ (CHỐNG XÓA CHÉO)
    // =====================================================================
    // Lấy thông tin thiết kế hiện tại
    const existingDesigns = await sellerService.listSellerDesigns({ id });
    if (existingDesigns.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thiết kế hoặc thiết kế đã bị xóa." });
    }

    const design = existingDesigns[0];

    // Lấy danh sách shop của Seller đang đăng nhập
    const sellerShops = await sellerService.listShops({ seller_id: currentSellerId });
    const sellerShopIds = sellerShops.map((s: any) => s.id);

    // Kiểm tra xem thiết kế này có thuộc về một trong các shop của Seller không
    if (!sellerShopIds.includes(design.shop_id)) {
      return res.status(403).json({ 
        error: "Forbidden: Bạn không có quyền xóa thiết kế của người khác!" 
      });
    }

    // =====================================================================
    // 3. THỰC THI LỆNH XÓA SAU KHI VƯỢT QUA BẢO MẬT
    // =====================================================================
    await sellerService.deleteSellerDesigns([id]);

    res.json({ status: "success", message: "Đã xóa thiết kế khỏi thư viện thành công." });
  } catch (error: any) {
    console.error("LỖI XÓA THIẾT KẾ:", error.message);
    res.status(500).json({ error: error.message });
  }
}
