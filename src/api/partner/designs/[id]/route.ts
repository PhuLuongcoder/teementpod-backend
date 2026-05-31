import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    
    // Ép kiểu as any để qua mặt TypeScript
    const sellerService = req.scope.resolve("sellerModuleService") as any;

    await sellerService.deleteSellerDesigns([id]);

    res.json({ status: "success", message: "Đã xóa thiết kế khỏi thư viện thành công." });
  } catch (error: any) {
    // Thêm log console để nếu còn lỗi thì terminal Backend sẽ hiện rõ nguyên nhân
    console.error("LỖI XÓA THIẾT KẾ:", error.message);
    res.status(500).json({ error: error.message });
  }
}