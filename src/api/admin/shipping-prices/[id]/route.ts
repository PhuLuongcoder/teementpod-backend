import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// [DELETE] Xóa vĩnh viễn một cấu hình phí vận chuyển theo ID
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    // Sử dụng as any để bỏ qua kiểm tra strict type của Medusa v2
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    await sellerService.deleteShippingPrices([id]);

    res.json({ status: "success", message: "Đã xóa cấu hình giá vận chuyển thành công." });
  } catch (error: any) {
    console.error("❌ LỖI XÓA GIÁ VẬN CHUYỂN:", error.message);
    res.status(500).json({ error: error.message });
  }
}